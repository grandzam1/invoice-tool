import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { InvoiceDocument } from '../types';
import { mapInvoiceToTemplate, TemplateInvoiceView } from '../templates/mapInvoiceToTemplate';
import invoice1Html from '../templates/invoice1.html?raw';
import invoice2Html from '../templates/invoice2.html?raw';

const TEMPLATES = [
  { id: 'invoice1', label: 'Invoice 1', srcDoc: invoice1Html },
  { id: 'invoice2', label: 'Invoice 2', srcDoc: invoice2Html },
] as const;

type TemplateId = (typeof TEMPLATES)[number]['id'];

type TemplateFrameWindow = Window & {
  fillInvoice?: (view: TemplateInvoiceView) => void;
};

interface TemplatePreviewProps {
  invoice: InvoiceDocument;
  open: boolean;
  onClose: () => void;
}

export interface TemplatePreviewHandle {
  print: () => void;
}

export const TemplatePreview = forwardRef<TemplatePreviewHandle, TemplatePreviewProps>(
  function TemplatePreview({ invoice, open, onClose }, ref) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [templateId, setTemplateId] = useState<TemplateId>(TEMPLATES[0].id);
  const template = TEMPLATES.find((item) => item.id === templateId) ?? TEMPLATES[0];

  const paint = () => {
    const frameWindow = frameRef.current?.contentWindow as TemplateFrameWindow | null;
    if (frameWindow?.fillInvoice) {
      frameWindow.fillInvoice(mapInvoiceToTemplate(invoice));
    }
  };

  useImperativeHandle(ref, () => ({
    print: () => {
      const frameWindow = frameRef.current?.contentWindow;
      if (frameWindow) frameWindow.print();
      else window.print();
    },
  }));

  const openInNewTab = () => {
    const view = mapInvoiceToTemplate(invoice);
    const popup = window.open('', '_blank');
    if (!popup) return;
    popup.document.open();
    popup.document.write(template.srcDoc);
    popup.document.close();
    const apply = () => {
      const target = popup as TemplateFrameWindow;
      if (typeof target.fillInvoice !== 'function') return false;
      target.fillInvoice(view);
      return true;
    };
    if (apply()) return;
    const timer = window.setInterval(() => {
      if (popup.closed || apply()) window.clearInterval(timer);
    }, 50);
    window.setTimeout(() => window.clearInterval(timer), 4000);
  };

  useEffect(() => {
    paint();
  }, [invoice, template.id, template.srcDoc, open]);

  return (
    <aside
      className={`template-preview flex h-full min-h-0 min-w-0 flex-col border-l border-zinc-800 bg-[#09090b] ${open ? '' : 'max-lg:hidden'}`}
    >
      <div className="h-12 px-3 border-b border-zinc-800 flex items-center gap-2 shrink-0">
        <label htmlFor="template-picker" className="text-[11px] uppercase tracking-wider text-zinc-500 shrink-0">
          Template
        </label>
        <select
          id="template-picker"
          value={templateId}
          onChange={(event) => setTemplateId(event.target.value as TemplateId)}
          className="h-8 min-w-0 flex-1 bg-zinc-900 border border-zinc-800 rounded-md px-2 text-xs text-zinc-200 focus:outline-none focus:border-zinc-600"
        >
          {TEMPLATES.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={openInNewTab}
          className="h-8 px-2.5 text-xs font-medium rounded-md border border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 shrink-0 cursor-pointer"
        >
          Open in tab
        </button>
        <button
          type="button"
          onClick={onClose}
          className="lg:hidden h-8 px-2.5 text-xs font-medium rounded-md border border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 shrink-0 cursor-pointer"
        >
          Close
        </button>
      </div>
      <div className="template-preview-stage">
        <div className="template-preview-frame">
          <iframe
            key={template.id}
            ref={frameRef}
            title="Invoice template preview"
            srcDoc={template.srcDoc}
            onLoad={paint}
            className="template-preview-iframe"
          />
        </div>
      </div>
      </aside>
  );
});
