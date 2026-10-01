import { editPath, readEditInvoiceId } from './editPath';

export const HOME_PATH = '/';
export const UPLOAD_PATH = '/templates/upload';

export type AppView = 'dashboard' | 'editor' | 'upload';

export function readAppLocation(pathname = window.location.pathname): { view: AppView; invoiceId: string | null } {
  if (pathname === UPLOAD_PATH || pathname === `${UPLOAD_PATH}/`) {
    return { view: 'upload', invoiceId: null };
  }
  const invoiceId = readEditInvoiceId(pathname);
  if (invoiceId) return { view: 'editor', invoiceId };
  return { view: 'dashboard', invoiceId: null };
}

/** Push a same-origin path, then let the app sync from popstate. */
export function navigateTo(path: string): void {
  const url = new URL(path, window.location.href);
  const next = `${url.pathname}${url.search}${url.hash}`;
  const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (next !== current) window.history.pushState({}, '', next);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

export { editPath };
