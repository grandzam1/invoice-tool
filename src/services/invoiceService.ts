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
const LOCAL_STORAGE_KEY = 'visual_invoice_cms_cache';

function getLocalCache(): InvoiceDocument[] {
  try {
    const data = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {
    // Ignore storage parse errors
  }
  return [];
}

function setLocalCache(invoices: InvoiceDocument[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(invoices));
  } catch {
    // Ignore storage write errors
  }
}

export async function getInvoices(): Promise<InvoiceDocument[]> {
  try {
    const q = query(collection(db, COLLECTION_NAME), orderBy('updated_at', 'desc'));
    
    // Race with a 4-second timeout to prevent hanging if the network is delayed or offline
    const fetchPromise = getDocs(q);
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Firestore backend response timeout')), 4000)
    );

    const snapshot = await Promise.race([fetchPromise, timeoutPromise]);
    const invoices: InvoiceDocument[] = [];
    snapshot.forEach((d) => {
      invoices.push(d.data() as InvoiceDocument);
    });

    if (invoices.length > 0) {
      setLocalCache(invoices);
    }
    return invoices;
  } catch (error) {
    console.warn('Firestore getInvoices unavailable or timed out, using local cache:', error);
    const cached = getLocalCache();
    if (cached.length > 0) {
      return cached;
    }
    return [];
  }
}

export async function getInvoice(id: string): Promise<InvoiceDocument | null> {
  const path = `${COLLECTION_NAME}/${id}`;
  try {
    const fetchPromise = getDoc(doc(db, COLLECTION_NAME, id));
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Firestore timeout')), 3500)
    );
    const docSnap = await Promise.race([fetchPromise, timeoutPromise]);
    if (docSnap.exists()) {
      return docSnap.data() as InvoiceDocument;
    }
    return null;
  } catch (error) {
    console.warn('Firestore getInvoice failed, checking cache:', error);
    const cached = getLocalCache().find((i) => i.id === id);
    if (cached) return cached;
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function saveInvoice(invoice: InvoiceDocument): Promise<void> {
  const path = `${COLLECTION_NAME}/${invoice.id}`;
  const updatedInvoice: InvoiceDocument = {
    ...invoice,
    client_name: invoice.content.to.clientName || 'Unnamed Client',
    date: invoice.content.to.date || new Date().toLocaleDateString(),
    updated_at: new Date().toISOString(),
  };

  // Update local cache immediately for instant persistence
  const currentList = getLocalCache();
  const idx = currentList.findIndex((i) => i.id === invoice.id);
  if (idx >= 0) {
    currentList[idx] = updatedInvoice;
  } else {
    currentList.unshift(updatedInvoice);
  }
  setLocalCache(currentList);

  try {
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

  // Update local cache immediately
  const currentList = getLocalCache();
  currentList.unshift(newInvoice);
  setLocalCache(currentList);

  try {
    await setDoc(doc(db, COLLECTION_NAME, newInvoice.id), newInvoice);
    return newInvoice;
  } catch (error) {
    console.warn('Saving new invoice to remote Firestore failed, retained locally:', error);
    return newInvoice;
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

  // Update local cache immediately
  const currentList = getLocalCache();
  currentList.unshift(cloned);
  setLocalCache(currentList);

  try {
    await setDoc(doc(db, COLLECTION_NAME, newId), cloned);
    return cloned;
  } catch (error) {
    console.warn('Saving duplicated invoice to Firestore failed, retained locally:', error);
    return cloned;
  }
}

export async function deleteInvoice(id: string): Promise<void> {
  const path = `${COLLECTION_NAME}/${id}`;

  // Update local cache immediately
  const currentList = getLocalCache().filter((i) => i.id !== id);
  setLocalCache(currentList);

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
    setLocalCache([defaultDoc]);
    try {
      await setDoc(doc(db, COLLECTION_NAME, defaultDoc.id), defaultDoc);
    } catch (e) {
      console.warn('Could not write seed to remote Firestore:', e);
    }
    return defaultDoc;
  } catch (error) {
    console.warn('Could not seed or query invoices, returning local default:', error);
    const defaultDoc = createNewInvoice('INV-2021-001');
    setLocalCache([defaultDoc]);
    return defaultDoc;
  }
}
