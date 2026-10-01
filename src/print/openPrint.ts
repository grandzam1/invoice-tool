import { InvoiceDocument } from '../types';
import { DocumentItemRow } from '../templates/documentFields';

export const PRINT_PAYLOAD_KEY = 'invoice-print-payload';

export interface PrintPayload {
  typeId: string;
  theme: string;
  invoice: InvoiceDocument;
  draft: { values: Record<string, string>; items: DocumentItemRow[] } | null;
}

export function printPath(invoiceId: string, typeId: string, theme: string): string {
  const params = new URLSearchParams();
  params.set('type', typeId);
  if (theme && theme !== 'classic') params.set('theme', theme);
  return `/invoices/${encodeURIComponent(invoiceId)}/print?${params.toString()}`;
}

export function rememberPrintPayload(payload: PrintPayload): void {
  try {
    sessionStorage.setItem(PRINT_PAYLOAD_KEY, JSON.stringify(payload));
  } catch {
    // A large signature can exceed sessionStorage. The print page then loads the saved invoice.
  }
}

export function readPrintPayload(invoiceId: string): PrintPayload | null {
  try {
    const raw = sessionStorage.getItem(PRINT_PAYLOAD_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PrintPayload;
    if (!parsed?.invoice || parsed.invoice.id !== invoiceId || typeof parsed.typeId !== 'string') return null;
    return parsed;
  } catch {
    return null;
  }
}

export function openPrintRoute(invoiceId: string, typeId: string, theme: string): void {
  const url = printPath(invoiceId, typeId, theme);
  const popup = window.open(url, '_blank');
  if (!popup) window.location.assign(url);
}
