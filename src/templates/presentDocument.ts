const VIEWPORT = 'width=device-width, initial-scale=1, viewport-fit=cover';

const SHEET_FIT = `<style id="sheet-fit">
@media screen {
  html, body { overflow-x: hidden; }
  #sheet-scroll { overflow-x: hidden !important; max-width: 100%; }
  #sheet {
    --fit: min(1, (100dvw - 1px) / 210mm);
    width: 210mm !important;
    height: 297mm !important;
    transform-origin: top center !important;
    transform: scale(var(--fit)) !important;
    margin-top: 0 !important;
    margin-left: calc(210mm * (var(--fit) - 1) / 2) !important;
    margin-right: calc(210mm * (var(--fit) - 1) / 2) !important;
    margin-bottom: calc(297mm * (var(--fit) - 1)) !important;
  }
}
@media print {
  #sheet {
    transform: none !important;
    width: 210mm !important;
    height: 297mm !important;
    margin: 0 !important;
  }
}
</style>`;

export function presentDocument(html: string, theme: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  let meta = doc.head.querySelector('meta[name="viewport"]');
  if (!(meta instanceof HTMLMetaElement)) {
    meta = doc.createElement('meta');
    meta.setAttribute('name', 'viewport');
    doc.head.insertBefore(meta, doc.head.firstChild);
  }
  meta.setAttribute('content', VIEWPORT);
  if (!doc.getElementById('sheet-fit')) doc.head.insertAdjacentHTML('beforeend', SHEET_FIT);
  if (theme && theme !== 'classic') {
    doc.documentElement.setAttribute('data-theme', theme);
    doc.getElementById('sheet')?.setAttribute('data-theme', theme);
  }
  return `<!DOCTYPE html>\n${doc.documentElement.outerHTML}`;
}
