const PRINT_BOOT = `(async function () {
  var tailwind = document.querySelector('script[src="https://cdn.tailwindcss.com"]');
  if (!tailwind) return;
  if (!window.tailwind && (tailwind.async || tailwind.defer)) {
    await new Promise(function (resolve) {
      tailwind.addEventListener('load', resolve, { once: true });
      tailwind.addEventListener('error', resolve, { once: true });
    });
  }
  if (!document.querySelector('script[src="https://cdn.tailwindcss.com"]')) return;
  if (document.fonts && document.fonts.ready) await document.fonts.ready;
  window.print();
})();`;

export function armPrintDocument(html: string, theme: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  if (theme && theme !== 'classic') {
    doc.documentElement.setAttribute('data-theme', theme);
    doc.getElementById('sheet')?.setAttribute('data-theme', theme);
  }
  const script = doc.createElement('script');
  script.textContent = PRINT_BOOT;
  doc.body.appendChild(script);
  return `<!DOCTYPE html>\n${doc.documentElement.outerHTML}`;
}
