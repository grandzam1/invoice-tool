import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { fillDocumentTemplate, fillFromValues } from '../templates/fillDocument';
import { DocumentItemRow, StoredDocumentType } from '../templates/documentFields';
import { mapInvoiceToTemplate, TemplateInvoiceView } from '../templates/mapInvoiceToTemplate';
import { documentPath } from '../print/openPrint';
import { useInvoiceDraft } from '../state/invoiceDraft';
import invoice1Html from '../templates/invoice1.html?raw';
import invoice2Html from '../templates/invoice2.html?raw';

const BUILTIN_TEMPLATES = [
  { id: 'builtin:invoice1', label: 'Invoice 1', srcDoc: invoice1Html },
  { id: 'builtin:invoice2', label: 'Invoice 2', srcDoc: invoice2Html },
] as const;

const DOCUMENT_SHELL = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<script id="preview-tailwind" src="https://cdn.tailwindcss.com"></script>
<script>
window.addEventListener('message', function (event) {
  if (event.source !== window.parent) return;
  var data = event.data;
  if (!data || data.type !== 'preview:html' || typeof data.html !== 'string') return;
  var parsed = new DOMParser().parseFromString(data.html, 'text/html');
  document.documentElement.className = parsed.documentElement.className || '';
  Array.prototype.forEach.call(document.head.querySelectorAll('style,link,meta'), function (node) { node.remove(); });
  Array.prototype.forEach.call(parsed.head.children, function (node) {
    if (node.tagName === 'SCRIPT') return;
    document.head.appendChild(document.importNode(node, true));
  });
  document.body.replaceWith(document.importNode(parsed.body, true));
  window.parent.postMessage({ type: 'preview:applied' }, '*');
});
</script>
</head>
<body></body>
</html>`;

type TemplateFrameWindow = Window & {
  fillInvoice?: (view: TemplateInvoiceView) => void;
};

interface TemplatePreviewProps {
  open: boolean;
  onClose: () => void;
  documentTypes: StoredDocumentType[];
  selectedTypeId: string;
  onSelectType: (id: string) => void;
  draft: { values: Record<string, string>; items: DocumentItemRow[] } | null;
}

export interface TemplatePreviewHandle {
  print: () => void;
  usingDocumentTemplate: () => boolean;
  theme: () => string;
}

export const TemplatePreview = forwardRef<TemplatePreviewHandle, TemplatePreviewProps>(
  function TemplatePreview({ open, onClose, documentTypes, selectedTypeId, onSelectType, draft }, ref) {
  const { active: invoice } = useInvoiceDraft();
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [theme, setTheme] = useState('classic');
  const documentType = documentTypes.find((item) => item.id === selectedTypeId) ?? null;
  const builtin = BUILTIN_TEMPLATES.find((item) => item.id === selectedTypeId) ?? null;
  const isDocument = documentType != null;
  const themes = documentType?.themes?.length ? documentType.themes : ['classic'];

  const filledDocument = useMemo(() => {
    if (!documentType || !invoice) return '';
    if (documentType.id === 'invoice1') return fillDocumentTemplate(documentType.html, invoice, { embed: true });
    const values = draft?.values || {};
    const items = (draft?.items || []).map((item) => item.values);
    return fillFromValues(documentType.html, values, items, { embed: true });
  }, [documentType, invoice, draft]);

  const srcDoc = isDocument ? DOCUMENT_SHELL : builtin?.srcDoc || '';
  const filledRef = useRef(filledDocument);
  filledRef.current = filledDocument;

  const fitSheet = () => {
    const frame = frameRef.current;
    const sheet = frame?.contentDocument?.getElementById('sheet');
    if (!frame || !sheet) return;
    const width = sheet.offsetWidth;
    const height = sheet.offsetHeight;
    if (!width || !height) return;
    const scale = Math.min(frame.clientWidth / width, Math.max(0.1, frame.clientHeight / height));
    const extraWidth = width * (1 - scale);
    const extraHeight = height * (1 - scale);
    sheet.style.transformOrigin = 'top center';
    sheet.style.transform = `scale(${scale})`;
    sheet.style.marginLeft = `${-extraWidth / 2}px`;
    sheet.style.marginRight = `${-extraWidth / 2}px`;
    sheet.style.marginBottom = `${-extraHeight}px`;
  };

  const resetSheet = () => {
    const sheet = frameRef.current?.contentDocument?.getElementById('sheet');
    if (!sheet) return;
    sheet.style.transform = 'none';
    sheet.style.marginLeft = '0';
    sheet.style.marginRight = '0';
    sheet.style.marginBottom = '0';
  };

  const applyTheme = (name: string) => {
    const doc = frameRef.current?.contentDocument;
    if (!doc?.documentElement) return;
    const sheet = doc.getElementById('sheet');
    if (!name || name === 'classic') {
      doc.documentElement.removeAttribute('data-theme');
      sheet?.removeAttribute('data-theme');
      return;
    }
    doc.documentElement.setAttribute('data-theme', name);
    sheet?.setAttribute('data-theme', name);
  };

  const postDocument = () => {
    const frame = frameRef.current?.contentWindow;
    const html = filledRef.current;
    if (!frame || !html) return;
    frame.postMessage({ type: 'preview:html', html }, '*');
  };

  const paint = () => {
    if (isDocument) {
      postDocument();
      return;
    }
    if (!invoice) return;
    const frameWindow = frameRef.current?.contentWindow as TemplateFrameWindow | null;
    if (frameWindow?.fillInvoice) {
      frameWindow.fillInvoice(mapInvoiceToTemplate(invoice));
    }
  };

  useImperativeHandle(ref, () => ({
    usingDocumentTemplate: () => isDocument,
    theme: () => theme,
    print: () => {
      const frameWindow = frameRef.current?.contentWindow;
      if (!frameWindow) {
        window.print();
        return;
      }
      if (isDocument) resetSheet();
      frameWindow.print();
    },
  }));

  const typeId = selectedTypeId.startsWith('builtin:') ? selectedTypeId.slice('builtin:'.length) : selectedTypeId;
  const documentHref = invoice ? documentPath(invoice.id, typeId, theme) : '';

  useEffect(() => {
    setTheme(themes[0] || 'classic');
  }, [selectedTypeId]);

  useEffect(() => {
    paint();
  }, [invoice, selectedTypeId, open, theme, filledDocument, isDocument]);

  useEffect(() => {
    if (!isDocument) return;
    applyTheme(theme);
    const onMessage = (event: MessageEvent) => {
      if (event.source !== frameRef.current?.contentWindow) return;
      if (event.data?.type !== 'preview:applied') return;
      applyTheme(theme);
      fitSheet();
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [isDocument, theme]);

  useEffect(() => {
    if (!isDocument) return;
    const onResize = () => fitSheet();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [isDocument]);

  if (!invoice) return null;

  return (
    <aside
      className={`template-preview flex h-full min-h-0 min-w-0 flex-col border-l border-zinc-800 bg-[#09090b] ${open ? '' : 'max-lg:hidden'}`}
    >
      <div className="px-3 py-2 border-b border-zinc-800 flex flex-col gap-2 shrink-0">
        <div className="flex items-center gap-2">
        <label htmlFor="template-picker" className="text-[11px] uppercase tracking-wider text-zinc-500 shrink-0">
          Template
        </label>
        <select
          id="template-picker"
          value={selectedTypeId}
          onChange={(event) => onSelectType(event.target.value)}
          className="h-8 min-w-0 flex-1 bg-zinc-900 border border-zinc-800 rounded-md px-2 text-xs text-zinc-200 focus:outline-none focus:border-zinc-600"
        >
          {documentTypes.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
          {BUILTIN_TEMPLATES.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
        <a
          href={documentHref}
          target="_blank"
          className="h-8 px-2.5 text-xs font-medium rounded-md border border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 shrink-0 cursor-pointer inline-flex items-center no-underline"
        >
          Open in tab
        </a>
        <button
          type="button"
          onClick={onClose}
          className="lg:hidden h-8 px-2.5 text-xs font-medium rounded-md border border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 shrink-0 cursor-pointer"
        >
          Close
        </button>
        </div>
        {isDocument && (
          <div className="flex flex-wrap gap-1" role="tablist" aria-label="Invoice design">
            {themes.map((name) => (
              <button
                key={name}
                type="button"
                role="tab"
                aria-selected={theme === name}
                onClick={() => setTheme(name)}
                className={`h-7 px-2.5 text-[11px] font-medium rounded-full border cursor-pointer ${theme === name ? 'bg-zinc-100 text-zinc-900 border-zinc-100' : 'border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100'}`}
              >
                {name.charAt(0).toUpperCase() + name.slice(1)}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="template-preview-stage">
        <div className="template-preview-frame">
          <iframe
            key={isDocument ? 'stored-document' : selectedTypeId}
            ref={frameRef}
            title="Invoice template preview"
            srcDoc={srcDoc}
            onLoad={() => {
              const frameWindow = frameRef.current?.contentWindow;
              frameWindow?.addEventListener('beforeprint', resetSheet);
              frameWindow?.addEventListener('afterprint', fitSheet);
              if (isDocument) postDocument();
              else paint();
            }}
            className="template-preview-iframe"
          />
        </div>
      </div>
      </aside>
  );
});
