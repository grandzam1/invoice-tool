import { useCallback, useEffect, useRef } from 'react';
import { InvoiceDocument } from '../types';
import editor2Html from '../editors/editor-v2.html?raw';
import {
  applyEditor2Invoice,
  clientsFromInvoices,
  Editor2Invoice,
  toEditor2Invoice,
} from '../editors/mapEditor2';
import { uploadInvoiceImage } from '../services/invoiceService';
import { blobToDataUrl, prepareSignature } from '../services/signatureBackground';
import { useInvoiceDraft } from '../state/invoiceDraft';

interface Editor2HostProps {
  invoices: InvoiceDocument[];
  onDuplicate: () => void;
  onDelete: () => void;
  onBack: () => void;
  onSave: () => void;
}

export function Editor2Host({
  invoices,
  onDuplicate,
  onDelete,
  onBack,
  onSave,
}: Editor2HostProps) {
  const { active: invoice, edit, undo, redo } = useInvoiceDraft();
  const frameRef = useRef<HTMLIFrameElement>(null);
  const invoiceRef = useRef(invoice);
  const invoicesRef = useRef(invoices);
  const echoRef = useRef<string | null>(null);
  const onChangeRef = useRef(edit);
  const onDuplicateRef = useRef(onDuplicate);
  const onDeleteRef = useRef(onDelete);
  const onBackRef = useRef(onBack);
  const onSaveRef = useRef(onSave);
  const onUndoRef = useRef(undo);
  const onRedoRef = useRef(redo);
  const inflightImages = useRef<Set<string>>(new Set());
  const pendingOriginalUrl = useRef('');

  invoiceRef.current = invoice;
  invoicesRef.current = invoices;
  onChangeRef.current = edit;
  onDuplicateRef.current = onDuplicate;
  onDeleteRef.current = onDelete;
  onBackRef.current = onBack;
  onSaveRef.current = onSave;
  onUndoRef.current = undo;
  onRedoRef.current = redo;

  const postHydrate = () => {
    const frame = frameRef.current?.contentWindow;
    const current = invoiceRef.current;
    if (!frame || !current) return;
    const form = toEditor2Invoice(current);
    echoRef.current = JSON.stringify(form);
    frame.postMessage(
      {
        type: 'editor2:hydrate',
        invoice: form,
        clients: clientsFromInvoices(invoicesRef.current),
      },
      '*'
    );
  };

  useEffect(() => {
    const dataUrlToFile = (dataUrl: string, name: string): File => {
      const [header, body] = dataUrl.split(',');
      const mime = /data:([^;]+)/.exec(header)?.[1] || 'image/png';
      const binary = atob(body || '');
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
      const ext = mime.includes('svg') ? 'svg' : (mime.split('/')[1] || 'png').replace('+xml', '');
      return new File([bytes], `${name}.${ext}`, { type: mime });
    };

    type ImageField = 'logoUrl' | 'signatureUrl' | 'signatureOrigUrl';
    type ImageKind = 'logo' | 'signature' | 'signature-original';
    let signatureJobs = 0;

    const publish = (next: InvoiceDocument) => {
      invoiceRef.current = next;
      echoRef.current = JSON.stringify(toEditor2Invoice(next));
      onChangeRef.current(next);
    };

    const patchStoredImage = (invoiceId: string, url: string, remote: string, fields: ImageField[]) => {
      const latest = invoiceRef.current;
      if (!latest || latest.id !== invoiceId || !remote || remote === url) return;
      const form = toEditor2Invoice(latest);
      let changed = false;
      fields.forEach((field) => {
        if (form[field] === url) {
          form[field] = remote;
          changed = true;
        }
      });
      if (!changed) return;
      publish(applyEditor2Invoice(latest, form));
    };

    const queueImageUpload = (invoiceId: string, type: ImageKind, url: string, fields?: ImageField[]) => {
      if (!url.startsWith('data:')) return;
      const token = `${type}:${url}`;
      if (inflightImages.current.has(token)) return;
      inflightImages.current.add(token);
      const targets = fields || [type === 'logo' ? 'logoUrl' : type === 'signature-original' ? 'signatureOrigUrl' : 'signatureUrl'];
      void uploadInvoiceImage(invoiceId, dataUrlToFile(url, type), type)
        .then((remote) => patchStoredImage(invoiceId, url, remote, targets))
        .catch((error) => {
          console.warn(`Keeping the ${type} image on the invoice record:`, error);
        });
    };

    const queueSignatureFiles = (invoiceId: string, originalUrl: string, cleanedUrl: string) => {
      if (originalUrl === cleanedUrl) {
        queueImageUpload(invoiceId, 'signature', originalUrl, ['signatureUrl', 'signatureOrigUrl']);
        return;
      }
      queueImageUpload(invoiceId, 'signature-original', originalUrl, ['signatureOrigUrl']);
      queueImageUpload(invoiceId, 'signature', cleanedUrl, ['signatureUrl']);
    };

    const handleSignature = async (dataUrl: string) => {
      const openInvoice = invoiceRef.current;
      if (!openInvoice) return;
      const invoiceId = openInvoice.id;
      signatureJobs += 1;
      pendingOriginalUrl.current = dataUrl;
      let cleanedUrl = dataUrl;
      try {
        const prepared = await prepareSignature(dataUrl);
        const during = invoiceRef.current;
        if (during && during.id === invoiceId) {
          cleanedUrl = prepared.skipped ? dataUrl : await blobToDataUrl(prepared.cleaned);
        }
      } catch (error) {
        console.warn('Signature background removal failed, keeping the original:', error);
        cleanedUrl = dataUrl;
      }
      const after = invoiceRef.current;
      if (!after || after.id !== invoiceId) {
        signatureJobs = Math.max(0, signatureJobs - 1);
        pendingOriginalUrl.current = '';
        return;
      }
      const form = toEditor2Invoice(after);
      form.signatureOrigUrl = dataUrl;
      form.signatureUrl = cleanedUrl;
      publish(applyEditor2Invoice(after, form));
      frameRef.current?.contentWindow?.postMessage(
        {
          type: 'editor2:hydrate',
          invoice: toEditor2Invoice(after),
          clients: clientsFromInvoices(invoicesRef.current),
        },
        '*'
      );
      queueSignatureFiles(invoiceId, dataUrl, cleanedUrl);
      pendingOriginalUrl.current = '';
      signatureJobs = Math.max(0, signatureJobs - 1);
    };

    const onMessage = (event: MessageEvent) => {
      if (event.source !== frameRef.current?.contentWindow) return;
      const data = event.data as { type?: string; invoice?: Editor2Invoice; dataUrl?: string } | null;
      if (!data || typeof data !== 'object') return;
      if (data.type === 'editor2:signature' && data.dataUrl) {
        void handleSignature(data.dataUrl);
        return;
      }
      if (data.type === 'editor2:update' && data.invoice) {
        const latest = invoiceRef.current;
        if (!latest) return;
        const form = data.invoice;
        const current = toEditor2Invoice(latest);
        if (signatureJobs > 0) {
          form.signatureUrl = current.signatureUrl;
          form.signatureOrigUrl = current.signatureOrigUrl;
        } else {
          const keepStored = (incoming: string, stored: string) =>
            incoming.startsWith('data:') && stored && !stored.startsWith('data:') ? stored : incoming;
          form.logoUrl = keepStored(form.logoUrl || '', current.logoUrl);
          form.signatureUrl = keepStored(form.signatureUrl || '', current.signatureUrl);
          form.signatureOrigUrl = keepStored(form.signatureOrigUrl || '', current.signatureOrigUrl);
        }
        const next = applyEditor2Invoice(latest, form);
        publish(next);
        queueImageUpload(next.id, 'logo', form.logoUrl || '');
        if (signatureJobs === 0) queueSignatureFiles(next.id, form.signatureOrigUrl || '', form.signatureUrl || '');
        return;
      }
      if (data.type === 'editor2:duplicate') onDuplicateRef.current();
      else if (data.type === 'editor2:delete') onDeleteRef.current();
      else if (data.type === 'editor2:back') onBackRef.current();
      else if (data.type === 'editor2:save') onSaveRef.current();
      else if (data.type === 'editor2:undo') onUndoRef.current();
      else if (data.type === 'editor2:redo') onRedoRef.current();
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  useEffect(() => {
    if (!invoice) return;
    const key = JSON.stringify(toEditor2Invoice(invoice));
    if (echoRef.current === key) return;
    postHydrate();
  }, [invoice, invoices]);

  const bindFrame = useCallback((node: HTMLIFrameElement | null) => {
    frameRef.current = node;
    if (!node || node.dataset.srcdocSet === '1') return;
    node.dataset.srcdocSet = '1';
    node.srcdoc = editor2Html;
  }, []);

  if (!invoice) return null;

  return (
    <div className="editor2-host min-h-0 min-w-0 flex-1 bg-[#F6F6FC]">
      <iframe
        ref={bindFrame}
        title="Editor 2"
        onLoad={() => {
          echoRef.current = null;
          postHydrate();
        }}
        className="h-full w-full border-0 bg-[#F6F6FC]"
      />
    </div>
  );
}
