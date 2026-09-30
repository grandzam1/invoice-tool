import { InvoiceDocument } from '../types';
import { parseCurrencyAmount } from '../components/InvoiceCanvas';

export interface TemplateInvoiceView {
  invoice: {
    invoice_number: string;
    invoice_date: string;
  };
  items: Array<{
    description: string;
    price: number;
    qty: number;
    visible: number;
  }>;
  totals: {
    subtotal: number;
    tax_amount: number;
    total: number;
  };
  display: {
    company_name: string;
    tagline: string;
    from_name: string;
    from_phone: string;
    from_email: string;
    client_name: string;
    client_phone: string;
    client_email: string;
    bank_name: string;
    bank_code: string;
    terms: string;
    logo_url: string;
    signature_url: string;
    signer_name: string;
  };
}

function lineQuantity(quantity: string | number): number {
  const parsed = parseCurrencyAmount(quantity);
  return parsed > 0 ? parsed : 1;
}

export function mapInvoiceToTemplate(invoice: InvoiceDocument): TemplateInvoiceView {
  const content = invoice.content;
  const from = content.from;
  const editor2 = invoice.editor2;
  const items = editor2
    ? editor2.items.map((item) => ({
        description: [item.desc, item.note].filter((part) => part && part.trim()).join(' — '),
        price: Number(item.price) || 0,
        qty: Number(item.qty) || 0,
        visible: 1,
      }))
    : (content.items || []).map((item) => {
        const qty = lineQuantity(item.quantity);
        const lineTotal = parseCurrencyAmount(item.total);
        const description = [item.title, item.subtitle].filter((part) => part && part.trim()).join(' — ');
        return {
          description,
          price: lineTotal / qty,
          qty,
          visible: 1,
        };
      });

  const subtotal = items.reduce((sum, item) => sum + item.price * item.qty, 0);
  let taxAmount = 0;
  let total = subtotal;
  if (editor2) {
    taxAmount = subtotal * ((Number(editor2.tax) || 0) / 100);
    total = subtotal + taxAmount - (Number(editor2.discount) || 0);
  } else {
    const overrideText = content.grandTotalOverride;
    const hasOverride = overrideText != null && String(overrideText).trim() !== '';
    const overrideTotal = hasOverride ? parseCurrencyAmount(overrideText) : subtotal;
    total = hasOverride ? overrideTotal : subtotal;
    taxAmount = hasOverride && overrideTotal > subtotal ? overrideTotal - subtotal : 0;
  }

  const paymentSection = (content.sections || []).find((section) => /payment/i.test(section.title || ''));
  const paymentLines = (paymentSection?.lines || [])
    .map((line) => (line.text || '').trim())
    .filter(Boolean);

  return {
    invoice: {
      invoice_number: invoice.number || '',
      invoice_date: content.to?.date || invoice.date || '',
    },
    items,
    totals: {
      subtotal,
      tax_amount: taxAmount,
      total,
    },
    display: {
      company_name: content.header?.title || '',
      tagline: from?.role || '',
      from_name: from?.name || '',
      from_phone: from?.phone || '',
      from_email: from?.email || '',
      client_name: content.to?.clientName || invoice.client_name || '',
      client_phone: content.to?.phone || '',
      client_email: content.to?.email || '',
      bank_name: paymentLines[0] || '',
      bank_code: paymentLines.slice(1).join('\n'),
      terms: content.terms?.text || '',
      logo_url: content.logoUrl || '/spacex-logo.svg',
      signature_url: content.signature?.imageUrl || '',
      signer_name: content.signature?.signeeName || '',
    },
  };
}
