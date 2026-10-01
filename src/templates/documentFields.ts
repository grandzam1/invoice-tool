import { formatCurrencyAmount, parseCurrencyAmount } from '../components/InvoiceCanvas';
import { InvoiceDocument, InvoiceSection } from '../types';

export interface DocumentField {
  key: string;
  label: string;
  repeat?: string[];
}

export function parseDocumentType(value: unknown): StoredDocumentType | null {
  if (!value || typeof value !== 'object') return null;
  const row = value as StoredDocumentType;
  if (typeof row.id !== 'string' || typeof row.name !== 'string' || typeof row.html !== 'string') return null;
  if (!Array.isArray(row.fields) || !Array.isArray(row.themes)) return null;
  return row;
}

export interface DocumentItemRow {
  id: string;
  values: Record<string, string>;
}

export interface StoredDocumentType {
  id: string;
  name: string;
  fields: DocumentField[];
  themes: string[];
  html: string;
}

export function blankDocumentDraft(type: StoredDocumentType): { values: Record<string, string>; items: DocumentItemRow[] } {
  const values: Record<string, string> = {};
  const repeat = type.fields.find((field) => Array.isArray(field.repeat) && field.repeat.length > 0);
  for (const field of type.fields) {
    if (!field.repeat) values[field.key] = '';
  }
  const columns = repeat?.repeat || ['description', 'price', 'qty'];
  const row: Record<string, string> = {};
  for (const column of columns) row[column] = column === 'qty' ? '1' : '';
  return { values, items: [{ id: crypto.randomUUID(), values: row }] };
}

function lineQuantity(quantity: string | number): number {
  const parsed = parseCurrencyAmount(quantity);
  return parsed > 0 ? parsed : 1;
}

export function readDocumentValues(invoice: InvoiceDocument): Record<string, string> {
  const content = invoice.content;
  const from = content.from;
  const payment = (content.sections || []).find((section) => /payment/i.test(section.title || ''));
  const paymentLines = (payment?.lines || []).map((line) => (line.text || '').trim()).filter(Boolean);
  return {
    invoice_number: invoice.number || '',
    invoice_date: content.to?.date || invoice.date || '',
    client_name: content.to?.clientName || invoice.client_name || '',
    client_phone: content.to?.phone || '',
    client_email: content.to?.email || '',
    from_name: from?.name || '',
    from_phone: from?.phone || '',
    from_email: from?.email || '',
    bank_name: paymentLines[0] || '',
    bank_code: paymentLines.slice(1).join('\n'),
    terms: content.terms?.text || '',
    logo_url: content.logoUrl || '',
    company_name: content.header?.title || '',
    tagline: from?.role || '',
    signature_url: content.signature?.imageUrl || '',
    signer_name: content.signature?.signeeName || '',
  };
}

export function readDocumentItems(invoice: InvoiceDocument): DocumentItemRow[] {
  if (invoice.editor2?.items?.length) {
    return invoice.editor2.items.map((item) => ({
      id: item.id,
      values: {
        description: [item.desc, item.note].filter((part) => part && part.trim()).join(' — '),
        price: String(item.price ?? 0),
        qty: String(item.qty ?? 0),
      },
    }));
  }

  return (invoice.content.items || []).map((item) => {
    const qty = lineQuantity(item.quantity);
    const lineTotal = parseCurrencyAmount(item.total);
    return {
      id: item.id,
      values: {
        description: [item.title, item.subtitle].filter((part) => part && part.trim()).join(' — '),
        price: String(lineTotal / qty),
        qty: String(item.quantity ?? qty),
      },
    };
  });
}

export function applyDocumentFields(
  invoice: InvoiceDocument,
  values: Record<string, string>,
  items: DocumentItemRow[],
): InvoiceDocument {
  const content = invoice.content;
  const paymentIndex = (content.sections || []).findIndex((section) => /payment/i.test(section.title || ''));
  const bankLines = [values.bank_name || '', ...(values.bank_code || '').split('\n')].filter((line) => line.trim());
  const payment: InvoiceSection = {
    id: paymentIndex >= 0 ? content.sections[paymentIndex].id : 'sec-payment',
    title: paymentIndex >= 0 ? content.sections[paymentIndex].title : 'PAYMENT METHOD',
    lines: bankLines.map((text, index) => ({
      id: paymentIndex >= 0 ? content.sections[paymentIndex].lines[index]?.id || `pay-${index}` : `pay-${index}`,
      text,
    })),
  };
  const sections = [...(content.sections || [])];
  if (paymentIndex >= 0) sections[paymentIndex] = payment;
  else sections.unshift(payment);

  const nextItems = items.map((item) => {
    const qty = Number(item.values.qty) || 0;
    const price = Number(item.values.price) || 0;
    return {
      id: item.id,
      title: item.values.description || '',
      subtitle: '',
      quantity: item.values.qty || '0',
      total: formatCurrencyAmount(price * qty),
    };
  });

  const next: InvoiceDocument = {
    ...invoice,
    number: values.invoice_number ?? invoice.number,
    client_name: values.client_name ?? invoice.client_name,
    date: values.invoice_date ?? invoice.date,
    content: {
      ...content,
      logoUrl: values.logo_url ?? content.logoUrl,
      header: { ...content.header, title: values.company_name ?? content.header.title },
      from: {
        label: content.from?.label || 'FROM',
        name: values.from_name ?? content.from?.name ?? '',
        role: values.tagline ?? content.from?.role ?? '',
        address: content.from?.address || '',
        phone: values.from_phone ?? content.from?.phone ?? '',
        email: values.from_email ?? content.from?.email ?? '',
      },
      to: {
        ...content.to,
        clientName: values.client_name ?? content.to.clientName,
        phone: values.client_phone ?? content.to.phone,
        email: values.client_email ?? content.to.email,
        date: values.invoice_date ?? content.to.date,
      },
      items: nextItems,
      sections,
      terms: { ...content.terms, text: values.terms ?? content.terms.text },
      signature: {
        ...content.signature,
        imageUrl: values.signature_url ?? content.signature.imageUrl,
        signeeName: values.signer_name ?? content.signature.signeeName,
      },
    },
  };

  if (invoice.editor2) {
    next.editor2 = {
      ...invoice.editor2,
      items: items.map((item) => ({
        id: item.id,
        desc: item.values.description || '',
        price: Number(item.values.price) || 0,
        qty: Number(item.values.qty) || 0,
      })),
    };
  }

  return next;
}
