import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import {PrintPage} from './components/PrintPage.tsx';
import './index.css';

const printMatch = window.location.pathname.match(/^\/invoices\/([^/]+)\/print\/?$/);
const printInvoiceId = printMatch ? decodeURIComponent(printMatch[1]) : null;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {printInvoiceId ? <PrintPage invoiceId={printInvoiceId} /> : <App />}
  </StrictMode>,
);
