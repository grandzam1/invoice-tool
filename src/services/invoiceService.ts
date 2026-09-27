import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
  query,
  orderBy,
} from 'firebase/firestore';
import {
  ref,
  uploadBytes,
  getDownloadURL,
} from 'firebase/storage';
import { db, storage, handleFirestoreError, OperationType } from '../firebase';
import { InvoiceDocument } from '../types';
import { createNewInvoice } from './defaultInvoice';

const COLLECTION_NAME = 'invoices';

export async function getInvoices(): Promise<InvoiceDocument[]> {
  try {
    const q = query(collection(db, COLLECTION_NAME), orderBy('updated_at', 'desc'));
    const snapshot = await getDocs(q);
    const invoices: InvoiceDocument[] = [];
    snapshot.forEach((d) => {
      invoices.push(d.data() as InvoiceDocument);
    });
    return invoices;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, COLLECTION_NAME);
  }
}

export async function getInvoice(id: string): Promise<InvoiceDocument | null> {
  const path = `${COLLECTION_NAME}/${id}`;
  try {
    const docSnap = await getDoc(doc(db, COLLECTION_NAME, id));
    if (docSnap.exists()) {
      return docSnap.data() as InvoiceDocument;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function saveInvoice(invoice: InvoiceDocument): Promise<void> {
  const path = `${COLLECTION_NAME}/${invoice.id}`;
  try {
    const updatedInvoice: InvoiceDocument = {
      ...invoice,
      client_name: invoice.content.to.clientName || 'Unnamed Client',
      date: invoice.content.to.date || new Date().toLocaleDateString(),
      updated_at: new Date().toISOString(),
    };
    await setDoc(doc(db, COLLECTION_NAME, invoice.id), updatedInvoice);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function createInvoice(initialData?: Partial<InvoiceDocument>): Promise<InvoiceDocument> {
  const newInvoice = createNewInvoice();
  if (initialData) {
    Object.assign(newInvoice, initialData);
  }
  const path = `${COLLECTION_NAME}/${newInvoice.id}`;
  try {
    await setDoc(doc(db, COLLECTION_NAME, newInvoice.id), newInvoice);
    return newInvoice;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function duplicateInvoice(sourceInvoice: InvoiceDocument): Promise<InvoiceDocument> {
  const now = new Date().toISOString();
  const newId = `inv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const cloned: InvoiceDocument = {
    ...JSON.parse(JSON.stringify(sourceInvoice)),
    id: newId,
    number: `${sourceInvoice.number}-COPY`,
    created_at: now,
    updated_at: now,
  };
  const path = `${COLLECTION_NAME}/${newId}`;
  try {
    await setDoc(doc(db, COLLECTION_NAME, newId), cloned);
    return cloned;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function deleteInvoice(id: string): Promise<void> {
  const path = `${COLLECTION_NAME}/${id}`;
  try {
    await deleteDoc(doc(db, COLLECTION_NAME, id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function uploadInvoiceImage(
  invoiceId: string,
  file: File,
  type: 'logo' | 'signature'
): Promise<string> {
  // Read file as base64 data URL first so it's always ready immediately
  const dataUrlPromise = new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (e) => reject(e);
    reader.readAsDataURL(file);
  });

  const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const storagePath = `invoices/${invoiceId}/${type}/${Date.now()}_${sanitizedName}`;
  const fileRef = ref(storage, storagePath);

  try {
    // Race Firebase Storage upload with a 3.5s timeout to prevent hanging if Storage is blocked/unconfigured
    const uploadWithTimeout = new Promise<string>(async (resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Storage upload timed out')), 3500);
      try {
        const uploadResult = await uploadBytes(fileRef, file, {
          contentType: file.type || 'image/png',
        });
        const downloadUrl = await getDownloadURL(uploadResult.ref);
        clearTimeout(timer);
        resolve(downloadUrl);
      } catch (e) {
        clearTimeout(timer);
        reject(e);
      }
    });

    return await uploadWithTimeout;
  } catch (storageErr) {
    console.warn('Firebase Storage upload failed or timed out, using Data URL fallback:', storageErr);
    return await dataUrlPromise;
  }
}

export async function seedInitialInvoiceIfEmpty(): Promise<InvoiceDocument> {
  try {
    const existing = await getInvoices();
    if (existing.length > 0) {
      return existing[0];
    }
    const defaultDoc = createNewInvoice('INV-2021-001');
    await setDoc(doc(db, COLLECTION_NAME, defaultDoc.id), defaultDoc);
    return defaultDoc;
  } catch (error) {
    console.warn('Could not seed or query invoices, returning local default:', error);
    return createNewInvoice('INV-2021-001');
  }
}
