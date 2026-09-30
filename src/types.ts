export interface InvoiceLineItem {
  id: string;
  title: string;
  subtitle: string;
  quantity: string | number;
  total: string | number;
}

export interface InvoiceSectionLine {
  id: string;
  text: string;
}

export interface InvoiceSection {
  id: string;
  title: string;
  lines: InvoiceSectionLine[];
}

export interface InvoicePartyInfo {
  label: string;
  name: string;
  role: string;
  address: string;
  phone: string;
  email: string;
}

export interface InvoiceContent {
  header: {
    address1: string;
    address2: string;
    phone1: string;
    phone2: string;
    title: string;
  };
  from?: InvoicePartyInfo;
  to: {
    label: string;
    clientName: string;
    role: string;
    address: string;
    phone: string;
    email: string;
    date: string;
  };
  items: InvoiceLineItem[];
  subtotalLabel: string;
  totalLabel: string;
  grandTotalOverride: string | null;
  sections: InvoiceSection[];
  signature: {
    imageUrl: string;
    originalImageUrl: string;
    signeeName: string;
    signeeRole: string;
  };
  terms: {
    title: string;
    text: string;
  };
  footer: {
    website: string;
  };
  logoUrl: string;
}

export interface InvoiceDocument {
  id: string;
  number: string;
  client_name: string;
  date: string;
  content: InvoiceContent;
  created_at: string;
  updated_at: string;
  /**
   * Extra fields the classic canvas does not edit.
   * Present after editor 2 saves an invoice. Ignored by InvoiceCanvas.
   */
  editor2?: {
    status: string;
    clientId: string;
    tax: number;
    currency?: string;
    discount?: number;
    paymentMethods?: Array<{ title: string; fields: Array<{ label: string; value: string }> }>;
    items: Array<{ id: string; desc: string; note?: string; price: number; qty: number }>;
  };
}
