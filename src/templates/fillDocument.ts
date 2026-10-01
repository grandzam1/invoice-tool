import { InvoiceDocument } from '../types';
import { mapInvoiceToTemplate } from './mapInvoiceToTemplate';

const PLACEHOLDER = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;

export interface FilledDocument {
  html: string;
}

function apply(value: string, values: Record<string, string>): string {
  return value.replace(PLACEHOLDER, (_match, key: string) => values[key] ?? '');
}

function replacePlaceholders(root: Node, values: Record<string, string>) {
  const elements: Element[] = [];
  if (root instanceof Element) elements.push(root);
  if (root instanceof Element || root instanceof Document || root instanceof DocumentFragment) {
    elements.push(...root.querySelectorAll('*'));
  }
  for (const element of elements) {
    for (const attr of [...element.attributes]) {
      if (attr.value.includes('{{')) element.setAttribute(attr.name, apply(attr.value, values));
    }
  }

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const textNodes: Text[] = [];
  let current = walker.nextNode();
  while (current) {
    textNodes.push(current as Text);
    current = walker.nextNode();
  }
  for (const text of textNodes) {
    if (text.nodeValue?.includes('{{')) text.nodeValue = apply(text.nodeValue, values);
  }
}

function stripActiveContent(root: ParentNode) {
  root.querySelectorAll('script').forEach((node) => node.remove());
  root.querySelectorAll('*').forEach((element) => {
    for (const attr of [...element.attributes]) {
      if (attr.name.toLowerCase().startsWith('on')) element.removeAttribute(attr.name);
    }
  });
  root.querySelectorAll('template').forEach((template) => stripActiveContent(template.content));
}

function moneyLabel(amount: number): string {
  const value = Number.isFinite(amount) ? amount : 0;
  return `$${value % 1 ? value.toFixed(2) : String(value)}`;
}

function dateLabel(iso: string): string {
  if (!iso) return '';
  const parts = iso.split('-');
  if (parts.length === 3) {
    const [year, month, day] = parts;
    return `${day}/${month}/${year.length === 4 ? year.slice(2) : year}`;
  }
  return iso;
}

function isDefaultCompany(name: string): boolean {
  const normalized = name.trim().toLowerCase();
  return !normalized || normalized === 'company name' || normalized === 'spacex' || normalized === 'invoice' || normalized === 'project invoice';
}

function isDefaultLogo(url: string): boolean {
  const path = url.split('?')[0];
  return !path || /\/spacex-logo\.svg$/.test(path) || path === '/spacex-logo.svg';
}

export function fillDocumentTemplate(
  html: string,
  invoice: InvoiceDocument,
  options: { embed: boolean },
): string {
  const view = mapInvoiceToTemplate(invoice);
  const display = view.display;
  const logoUrl = display.logo_url || '/spacex-logo.svg';
  const customLogo = !isDefaultLogo(logoUrl);
  const showLogo = customLogo || isDefaultCompany(display.company_name);
  const tagline = display.tagline.trim();
  const showTagline = Boolean(tagline) && tagline.toLowerCase() !== 'tagline goes here';

  const values: Record<string, string> = {
    invoice_number: view.invoice.invoice_number,
    invoice_date: dateLabel(view.invoice.invoice_date),
    client_name: display.client_name,
    client_phone: display.client_phone,
    client_email: display.client_email,
    from_name: display.from_name,
    from_phone: display.from_phone,
    from_email: display.from_email,
    bank_name: display.bank_name,
    bank_code: display.bank_code,
    terms: display.terms,
    subtotal: moneyLabel(view.totals.subtotal),
    tax: moneyLabel(view.totals.tax_amount),
    total: moneyLabel(view.totals.total),
    logo_url: logoUrl,
    company_name: display.company_name,
    tagline: showTagline ? tagline : '',
    logo_display: showLogo ? 'block' : 'none',
    company_display: showLogo ? 'none' : 'block',
    tagline_display: showLogo || !showTagline ? 'none' : 'block',
    signature_url: display.signature_url,
    signer_name: display.signer_name,
    signature_hidden: display.signature_url ? '' : 'hidden',
    signer_hidden: display.signer_name ? '' : 'hidden',
  };

  const items = view.items
    .filter((item) => item.visible !== 0)
    .map((item) => ({
      description: item.description,
      price: String(item.price),
      qty: String(item.qty),
    }));

  return fillFromValues(html, values, items, options);
}

export function fillFromValues(
  html: string,
  values: Record<string, string>,
  items: Array<Record<string, string>>,
  options: { embed: boolean },
): string {
  const rows = items.map((item) => {
    const price = Number(String(item.price ?? '').replace(/[^0-9.-]/g, '')) || 0;
    const qty = Number(item.qty) || 0;
    return {
      ...item,
      price: moneyLabel(price),
      qty: item.qty || '0',
      line_total: moneyLabel(price * qty),
    };
  });

  const doc = new DOMParser().parseFromString(html, 'text/html');
  stripActiveContent(doc);
  if (!doc.head.querySelector('script[src="https://cdn.tailwindcss.com"]')) {
    const tailwind = doc.createElement('script');
    tailwind.src = 'https://cdn.tailwindcss.com';
    doc.head.insertBefore(tailwind, doc.head.firstChild);
  }
  if (options.embed) doc.documentElement.classList.add('is-embed');

  const sample = doc.querySelector('template[data-repeat="items"]');
  const host = doc.getElementById('line-items');
  if (sample instanceof HTMLTemplateElement && host) {
    host.replaceChildren();
    rows.forEach((item, index) => {
      const row = sample.content.firstElementChild?.cloneNode(true);
      if (!(row instanceof Element)) return;
      if (row.classList.contains('paper') || row.classList.contains('band')) {
        row.classList.remove('paper', 'band');
        row.classList.add(index % 2 === 0 ? 'paper' : 'band');
      }
      replacePlaceholders(row, item);
      host.appendChild(row);
    });
    sample.remove();
  }

  replacePlaceholders(doc, values);
  return `<!DOCTYPE html>\n${doc.documentElement.outerHTML}`;
}
