import { useEffect, useState } from 'react';
import { authHeaders } from '../firebase';
import { getInvoice } from '../services/invoiceService';
import { fillDocumentTemplate, fillFromValues } from '../templates/fillDocument';
import { parseDocumentType, readDocumentItems, readDocumentValues, StoredDocumentType } from '../templates/documentFields';
import { InvoiceDocument } from '../types';
import { armPrintDocument } from '../print/armPrint';
import { readPrintPayload } from '../print/openPrint';

let startedFor: string | null = null;

async function loadDocumentType(typeId: string): Promise<StoredDocumentType | null> {
  const response = await fetch(`/api/document-types/${encodeURIComponent(typeId)}`, { headers: await authHeaders() });
  if (!response.ok) return null;
  return parseDocumentType(await response.json());
}

function fillType(type: StoredDocumentType, invoice: InvoiceDocument, draft: { values: Record<string, string>; items: { values: Record<string, string> }[] } | null): string {
  if (type.id === 'invoice1') return fillDocumentTemplate(type.html, invoice, { embed: false });
  const values = draft?.values ?? readDocumentValues(invoice);
  const items = (draft?.items ?? readDocumentItems(invoice)).map((item) => item.values);
  return fillFromValues(type.html, values, items, { embed: false });
}

export function PrintPage({ invoiceId }: { invoiceId: string }) {
  const [message, setMessage] = useState('Preparing document…');

  useEffect(() => {
    if (startedFor === invoiceId) return;
    startedFor = invoiceId;
    const params = new URLSearchParams(window.location.search);
    const payload = readPrintPayload(invoiceId);
    const typeId = params.get('type') || payload?.typeId || 'invoice1';
    const theme = params.get('theme') || payload?.theme || 'classic';

    void (async () => {
      try {
        const invoice = payload?.invoice?.id === invoiceId ? payload.invoice : await getInvoice(invoiceId);
        if (!invoice) {
          startedFor = null;
          setMessage('Document not found.');
          return;
        }
        const type = await loadDocumentType(typeId);
        if (!type) {
          startedFor = null;
          setMessage('Document type not found.');
          return;
        }
        const draft = payload && payload.typeId === type.id ? payload.draft : null;
        const filled = fillType(type, invoice, draft);
        document.open();
        document.write(armPrintDocument(filled, theme));
        document.close();
      } catch {
        startedFor = null;
        setMessage('Could not prepare this document for print.');
      }
    })();
  }, [invoiceId]);

  return (
    <p className="p-6 text-sm text-zinc-300">{message}</p>
  );
}
