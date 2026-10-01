export function editPath(invoiceId: string): string {
  return `/invoices/${encodeURIComponent(invoiceId)}/edit`;
}

export function readEditInvoiceId(pathname = window.location.pathname): string | null {
  const match = pathname.match(/^\/invoices\/([^/]+)\/edit\/?$/);
  if (!match) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}
