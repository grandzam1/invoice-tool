import { parseCurrencyAmount, formatCurrencyAmount } from '../components/InvoiceCanvas';
import { InvoiceContent, InvoiceDocument, InvoiceSection, InvoiceSectionLine } from '../types';

export interface Editor2Item {
  id: string;
  desc: string;
  note: string;
  price: number;
  qty: number;
}

export interface Editor2Person {
  name: string;
  phone: string;
  email: string;
}

export interface Editor2PaymentField {
  label: string;
  value: string;
}

export interface Editor2PaymentMethod {
  title: string;
  fields: Editor2PaymentField[];
}

export interface Editor2Invoice {
  id: string;
  no: string;
  date: string;
  status: string;
  clientId: string;
  company: {
    name: string;
    tagline: string;
    address: string;
    phones: string;
    website: string;
    email: string;
  };
  from: Editor2Person;
  to: Editor2Person & { role: string; address: string };
  items: Editor2Item[];
  tax: number;
  currency: string;
  discount: number;
  bank: { name: string; code: string };
  paymentMethods: Editor2PaymentMethod[];
  terms: string;
  signer: string;
  signerRole: string;
  logoUrl: string;
  signatureUrl: string;
  signatureOrigUrl: string;
}

export interface Editor2Client {
  id: string;
  name: string;
  phone: string;
  email: string;
}

function lineQuantity(quantity: string | number): number {
  const parsed = parseCurrencyAmount(quantity);
  return parsed > 0 ? parsed : 1;
}

function toIsoDate(value: string): string {
  const raw = (value || '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const parsed = Date.parse(raw);
  if (Number.isNaN(parsed)) return '';
  const date = new Date(parsed);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function paymentSection(content: InvoiceContent): InvoiceSection | undefined {
  return (content.sections || []).find((section) => /payment/i.test(section.title || ''));
}

function paymentLines(content: InvoiceContent): string[] {
  return (paymentSection(content)?.lines || []).map((line) => (line.text || '').trim());
}

function derivedItems(content: InvoiceContent): Editor2Item[] {
  return (content.items || []).map((item) => {
    const qty = lineQuantity(item.quantity);
    const lineTotal = parseCurrencyAmount(item.total);
    return {
      id: item.id,
      desc: item.title || '',
      note: item.subtitle || '',
      price: lineTotal / qty,
      qty,
    };
  });
}

function methodsFromBank(name: string, code: string): Editor2PaymentMethod[] {
  if (!name && !code) return [];
  return [{ title: name || 'Bank', fields: code ? [{ label: 'Details', value: code }] : [] }];
}

function derivedTaxPercent(content: InvoiceContent, items: Editor2Item[]): number {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.qty, 0);
  const overrideText = content.grandTotalOverride;
  const hasOverride = overrideText != null && String(overrideText).trim() !== '';
  if (!hasOverride || subtotal <= 0) return 0;
  const overrideTotal = parseCurrencyAmount(overrideText);
  if (overrideTotal <= subtotal) return 0;
  return ((overrideTotal - subtotal) / subtotal) * 100;
}

export function toEditor2Invoice(invoice: InvoiceDocument): Editor2Invoice {
  const content = invoice.content;
  const from = content.from;
  const lines = paymentLines(content);
  const extra = invoice.editor2;
  const items = extra
    ? extra.items.map((item) => ({
        id: item.id,
        desc: item.desc,
        note: item.note || '',
        price: Number(item.price) || 0,
        qty: Number(item.qty) || 0,
      }))
    : derivedItems(content);
  const paymentMethods = extra?.paymentMethods?.length
    ? extra.paymentMethods.map((method) => ({
        title: method.title || '',
        fields: (method.fields || []).map((field) => ({
          label: field.label || '',
          value: field.value || '',
        })),
      }))
    : methodsFromBank(lines[0] || '', lines.slice(1).filter(Boolean).join('\n'));
  const firstMethod = paymentMethods[0];

  return {
    id: invoice.id,
    no: invoice.number || '',
    date: toIsoDate(content.to?.date || invoice.date || ''),
    status: extra?.status || 'Draft',
    clientId: extra?.clientId || '',
    company: {
      name: content.header?.title || '',
      tagline: from?.role || '',
      address: from?.address || content.header?.address1 || '',
      phones: from?.phone || content.header?.phone1 || '',
      website: content.footer?.website || '',
      email: from?.email || '',
    },
    from: {
      name: from?.name || '',
      phone: from?.phone || '',
      email: from?.email || '',
    },
    to: {
      name: content.to?.clientName || invoice.client_name || '',
      role: content.to?.role || '',
      address: content.to?.address || '',
      phone: content.to?.phone || '',
      email: content.to?.email || '',
    },
    items,
    tax: extra ? Number(extra.tax) || 0 : derivedTaxPercent(content, items),
    currency: extra?.currency || 'USD',
    discount: Number(extra?.discount) || 0,
    bank: {
      name: firstMethod?.title || lines[0] || '',
      code: firstMethod
        ? firstMethod.fields.map((field) => [field.label, field.value].filter(Boolean).join(': ')).filter(Boolean).join('\n')
        : lines.slice(1).filter(Boolean).join('\n'),
    },
    paymentMethods,
    terms: content.terms?.text || '',
    signer: content.signature?.signeeName || '',
    signerRole: content.signature?.signeeRole || '',
    logoUrl: content.logoUrl || '',
    signatureUrl: content.signature?.imageUrl || '',
    signatureOrigUrl: content.signature?.originalImageUrl || '',
  };
}

export function clientsFromInvoices(invoices: InvoiceDocument[]): Editor2Client[] {
  const seen = new Map<string, Editor2Client>();
  invoices.forEach((invoice) => {
    const name = invoice.content?.to?.clientName?.trim();
    if (!name) return;
    const id = invoice.editor2?.clientId || `client:${name.toLowerCase()}`;
    if (seen.has(id)) return;
    seen.set(id, {
      id,
      name,
      phone: invoice.content.to.phone || '',
      email: invoice.content.to.email || '',
    });
  });
  return [...seen.values()];
}

function line(id: string, text: string): InvoiceSectionLine {
  return { id, text };
}

export function applyEditor2Invoice(doc: InvoiceDocument, form: Editor2Invoice): InvoiceDocument {
  const content: InvoiceContent = JSON.parse(JSON.stringify(doc.content));
  const companyAddress = form.company?.address || '';
  const companyPhones = form.company?.phones || form.from?.phone || '';
  const companyEmail = form.company?.email || form.from?.email || '';
  content.header = {
    ...content.header,
    title: form.company?.name || '',
    address1: companyAddress,
    phone1: companyPhones,
  };
  content.from = {
    label: content.from?.label || 'FROM',
    name: form.from?.name || form.company?.name || '',
    role: form.company?.tagline || '',
    address: companyAddress,
    phone: companyPhones,
    email: companyEmail,
  };
  content.footer = { ...content.footer, website: form.company?.website || '' };
  content.to = {
    ...content.to,
    clientName: form.to?.name || '',
    role: form.to?.role || '',
    address: form.to?.address || '',
    phone: form.to?.phone || '',
    email: form.to?.email || '',
    date: form.date || '',
  };

  const items = (form.items || []).map((item, index) => ({
    id: item.id || `item-${index}`,
    desc: item.desc || '',
    note: item.note || '',
    price: Number(item.price) || 0,
    qty: Number(item.qty) || 0,
  }));
  content.items = items.map((item) => ({
    id: item.id,
    title: item.desc,
    subtitle: item.note,
    quantity: item.qty,
    total: item.price * item.qty,
  }));

  const subtotal = items.reduce((sum, item) => sum + item.price * item.qty, 0);
  const tax = Number(form.tax) || 0;
  const discount = Number(form.discount) || 0;
  content.grandTotalOverride = formatCurrencyAmount(subtotal + subtotal * (tax / 100) - discount);

  const paymentMethods = (form.paymentMethods || []).map((method) => ({
    title: method.title || '',
    fields: (method.fields || []).map((field) => ({
      label: field.label || '',
      value: field.value || '',
    })),
  }));
  const existing = paymentSection(content);
  const bankLines = paymentMethods.length
    ? paymentMethods.flatMap((method, methodIndex) => [
        line(`pm-${methodIndex}-title`, method.title),
        ...method.fields.map((field, fieldIndex) =>
          line(`pm-${methodIndex}-f-${fieldIndex}`, [field.label, field.value].filter(Boolean).join(': '))
        ),
      ])
    : [
        line(existing?.lines?.[0]?.id || 'bank-name', form.bank?.name || ''),
        line(existing?.lines?.[1]?.id || 'bank-code', form.bank?.code || ''),
      ];
  if (existing) {
    existing.lines = bankLines;
  } else {
    content.sections = [
      ...(content.sections || []),
      { id: 'sec-payment', title: 'PAYMENT METHOD', lines: bankLines },
    ];
  }

  content.terms = { ...content.terms, text: form.terms || '' };
  content.logoUrl = form.logoUrl || '';
  content.signature = {
    imageUrl: form.signatureUrl || '',
    originalImageUrl: form.signatureOrigUrl || '',
    signeeName: form.signer || '',
    signeeRole: form.signerRole || '',
  };

  return {
    ...doc,
    number: form.no || doc.number,
    client_name: form.to?.name || 'Unnamed Client',
    date: form.date || doc.date,
    content,
    editor2: {
      status: form.status || 'Draft',
      clientId: form.clientId || '',
      tax,
      currency: form.currency || 'USD',
      discount,
      paymentMethods,
      items,
    },
  };
}
