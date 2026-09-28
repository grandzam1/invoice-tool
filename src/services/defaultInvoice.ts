import { InvoiceContent, InvoiceDocument } from '../types';

export const createDefaultInvoiceContent = (): InvoiceContent => ({
  header: {
    address1: '820 Colorado Building',
    address2: '2nd floor of LT, California',
    phone1: '+00 (123) 4567 890',
    phone2: '+00 (715) 8527 000',
    title: 'PROJECT INVOICE',
  },
  from: {
    label: 'FROM',
    name: 'STUDIO DESIGN CO.',
    role: 'Creative Studio',
    address: '820 Colorado Building, 2nd floor of LT, California',
    phone: '+00 (123) 4567 890',
    email: 'contact@tuddenydesaign.com',
  },
  to: {
    label: 'TO',
    clientName: 'ALEX ARNOLD',
    role: 'Manager',
    address: '12 NY Street, New York, USA 1001',
    phone: '+1 325 846 5653',
    email: 'info@yourmail.com',
    date: '06 Feb, 2021',
  },
  items: [
    {
      id: 'item-1',
      title: 'Proposal Design',
      subtitle: '65 Days Time',
      quantity: 8,
      total: '$1,200.00',
    },
    {
      id: 'item-2',
      title: 'Magazine Design',
      subtitle: '23 Days Time',
      quantity: 6,
      total: '$1,000.00',
    },
    {
      id: 'item-3',
      title: 'Stationery Design',
      subtitle: '35 Days Time',
      quantity: 3,
      total: '$3,600.00',
    },
    {
      id: 'item-4',
      title: 'News Paper Design',
      subtitle: '65 Days Time',
      quantity: 5,
      total: '$2,200.00',
    },
  ],
  subtotalLabel: 'SUB.TOTAL',
  totalLabel: 'TOTAL',
  grandTotalOverride: '$90,000.00', // matches screenshot exact override
  sections: [
    {
      id: 'sec-payment',
      title: 'PAYMENT METHOD',
      lines: [
        { id: 'p1', text: 'Bank Name' },
        { id: 'p2', text: 'A/C No. 888866663333' },
        { id: 'p3', text: 'A/C Holder : AnthonyB' },
        { id: 'p4', text: 'SWIFT CODE : AAAAAA' },
      ],
    },
    {
      id: 'sec-paypal',
      title: 'PAYPAL',
      lines: [
        { id: 'pp1', text: 'paypalpay@anthony.com' },
      ],
    },
  ],
  signature: {
    imageUrl: '', // default uses the handwritten font rendering of Anthony Bourdain
    signeeName: 'Anthouny Bourdain',
    signeeRole: 'Ceo & Founder',
  },
  terms: {
    title: 'Terms & Conditions',
    text: 'Innovative use of technology and seo to print for more please contact to terms in thisof technology and seo to print for more please contact to terms.',
  },
  footer: {
    website: 'WWW.TUDDENYDESAIGN.COM',
  },
  logoUrl: '',
});

export const createNewInvoice = (numberStr = 'INV-2021-001'): InvoiceDocument => {
  const now = new Date().toISOString();
  const id = `inv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const content = createDefaultInvoiceContent();
  return {
    id,
    number: numberStr,
    client_name: content.to.clientName,
    date: content.to.date,
    content,
    created_at: now,
    updated_at: now,
  };
};
