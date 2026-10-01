import { useEffect, useState } from 'react';
import { authHeaders } from '../firebase';
import { getInvoice } from '../services/invoiceService';
import { fillDocumentTemplate, fillFromValues } from '../templates/fillDocument';
import { parseDocumentType, readDocumentItems, readDocumentValues, StoredDocumentType } from '../templates/documentFields';
import { mapInvoiceToTemplate, TemplateInvoiceView } from '../templates/mapInvoiceToTemplate';
import { presentDocument } from '../templates/presentDocument';
import invoice2Html from '../templates/invoice2.html?raw';
import { InvoiceDocument } from '../types';

let startedFor: string | null = null;

async function loadDocumentType(typeId: string): Promise<StoredDocumentType | null> {
  const response = await fetch(`/api/document-types/${encodeURIComponent(typeId)}`, { headers: await authHeaders() });
  if (!response.ok) return null;
  return parseDocumentType(await response.json());
}

function fillSaved(type: StoredDocumentType, invoice: InvoiceDocument): string {
  if (type.id === 'invoice1') return fillDocumentTemplate(type.html, invoice, { embed: false });
  const items = readDocumentItems(invoice).map((item) => item.values);
  return fillFromValues(type.html, readDocumentValues(invoice), items, { embed: false });
}

function show(html: string) {
  document.open();
  document.write(html);
  document.close();
}

export function DocumentPage({ invoiceId }: { invoiceId: string }) {
  const [message, setMessage] = useState('Preparing document…');

  useEffect(() => {
    if (startedFor === invoiceId) return;
    startedFor = invoiceId;
    const params = new URLSearchParams(window.location.search);
    const typeId = params.get('type') || 'invoice1';
    const theme = params.get('theme') || 'classic';

    void (async () => {
      try {
        const invoice = await getInvoice(invoiceId);
        if (!invoice) {
          startedFor = null;
          setMessage('Document not found.');
          return;
        }
        const type = await loadDocumentType(typeId);
        if (type) {
          show(presentDocument(fillSaved(type, invoice), theme));
          return;
        }
        if (typeId === 'invoice2') {
          show(presentDocument(invoice2Html, theme));
          const target = window as Window & { fillInvoice?: (view: TemplateInvoiceView) => void };
          target.fillInvoice?.(mapInvoiceToTemplate(invoice));
          return;
        }
        startedFor = null;
        setMessage('Document type not found.');
      } catch {
        startedFor = null;
        setMessage('Could not prepare this document.');
      }
    })();
  }, [invoiceId]);

  return (
    <p className="p-6 text-sm text-zinc-300">{message}</p>
  );
}
