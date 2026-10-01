import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import {DocumentPage} from './components/DocumentPage.tsx';
import {PrintPage} from './components/PrintPage.tsx';
import './index.css';

const printMatch = window.location.pathname.match(/^\/invoices\/([^/]+)\/print\/?$/);
const printInvoiceId = printMatch ? decodeURIComponent(printMatch[1]) : null;
const documentMatch = window.location.pathname.match(/^\/invoice\/([^/]+)\/?$/);
const documentInvoiceId = documentMatch ? decodeURIComponent(documentMatch[1]) : null;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {printInvoiceId ? <PrintPage invoiceId={printInvoiceId} /> : documentInvoiceId ? <DocumentPage invoiceId={documentInvoiceId} /> : <App />}
  </StrictMode>,
);
