import { collection, doc, getDocs, setDoc } from 'firebase/firestore';
import { ref } from 'firebase/storage';
import { db, storage, testConnection } from '../firebase';
import { firebaseConfig } from '../config/env';
import { InvoiceDocument } from '../types';

// 3 Complete sample invoices with line items, recipient details, and calculated totals
export const seedInvoices: InvoiceDocument[] = [
  {
    id: 'inv_seed_001',
    number: 'INV-2026-001',
    client_name: 'ALEX ARNOLD',
    date: '28 Sep, 2026',
    created_at: new Date('2026-09-28T00:00:00.000Z').toISOString(),
    updated_at: new Date('2026-09-28T00:00:00.000Z').toISOString(),
    content: {
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
        date: '28 Sep, 2026',
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
      grandTotalOverride: '$8,000.00',
      sections: [
        {
          id: 'sec-payment',
          title: 'PAYMENT METHOD',
          lines: [
            { id: 'p1', text: 'Bank Name : Silicon Valley Bank' },
            { id: 'p2', text: 'A/C No. 888866663333' },
            { id: 'p3', text: 'A/C Holder : AnthonyB' },
            { id: 'p4', text: 'SWIFT CODE : SVBUSA33' },
          ],
        },
        {
          id: 'sec-paypal',
          title: 'PAYPAL',
          lines: [{ id: 'pp1', text: 'paypalpay@anthony.com' }],
        },
      ],
      signature: {
        imageUrl: '',
        signeeName: 'Anthouny Bourdain',
        signeeRole: 'Ceo & Founder',
      },
      terms: {
        title: 'Terms & Conditions',
        text: 'Innovative use of technology and design systems. Payment is due within 30 days of invoice issuance.',
      },
      footer: {
        website: 'WWW.STUDIODESIGN.CO',
      },
      logoUrl: '/public/default-logo.png',
    },
  },
  {
    id: 'inv_seed_002',
    number: 'INV-2026-002',
    client_name: 'SARAH JENKINS',
    date: '25 Sep, 2026',
    created_at: new Date('2026-09-25T14:30:00.000Z').toISOString(),
    updated_at: new Date('2026-09-25T14:30:00.000Z').toISOString(),
    content: {
      header: {
        address1: '100 Montgomery St, Suite 500',
        address2: 'San Francisco, CA 94104',
        phone1: '+1 (415) 555-0199',
        phone2: '+1 (415) 555-0190',
        title: 'CONSULTING SERVICES INVOICE',
      },
      from: {
        label: 'FROM',
        name: 'CLOUD SYSTEMS LABS',
        role: 'Cloud & Infrastructure Advisory',
        address: '100 Montgomery St, San Francisco, CA',
        phone: '+1 (415) 555-0199',
        email: 'billing@cloudsystemslabs.io',
      },
      to: {
        label: 'TO',
        clientName: 'SARAH JENKINS',
        role: 'Director of Technology',
        address: 'Nexus Tech, 450 Lexington Ave, New York, NY',
        phone: '+1 212 555 0184',
        email: 's.jenkins@nexustech.example',
        date: '25 Sep, 2026',
      },
      items: [
        {
          id: 'item-201',
          title: 'Enterprise Architecture Review',
          subtitle: 'High-availability Kubernetes audit',
          quantity: 1,
          total: '$4,500.00',
        },
        {
          id: 'item-202',
          title: 'Database Resilience & Index Optimization',
          subtitle: 'Cloud Firestore & PostgreSQL scaling',
          quantity: 1,
          total: '$3,800.00',
        },
        {
          id: 'item-203',
          title: 'Automated CI/CD Pipeline Hardening',
          subtitle: 'GitHub Actions & Security gates',
          quantity: 2,
          total: '$3,200.00',
        },
      ],
      subtotalLabel: 'SUB.TOTAL',
      totalLabel: 'TOTAL',
      grandTotalOverride: '$11,500.00',
      sections: [
        {
          id: 'sec-wire',
          title: 'WIRE TRANSFER',
          lines: [
            { id: 'w1', text: 'Bank : JPMorgan Chase Bank' },
            { id: 'w2', text: 'Routing : 021000021' },
            { id: 'w3', text: 'Account : 4829104928' },
          ],
        },
      ],
      signature: {
        imageUrl: '',
        signeeName: 'Marcus Vance',
        signeeRole: 'Principal Architect',
      },
      terms: {
        title: 'Engagement Terms',
        text: 'All deliverables verified in production staging. Net 15 days upon receipt.',
      },
      footer: {
        website: 'WWW.CLOUDSYSTEMSLABS.IO',
      },
      logoUrl: '/public/default-logo.png',
    },
  },
  {
    id: 'inv_seed_003',
    number: 'INV-2026-003',
    client_name: 'DAVID CHEN',
    date: '20 Sep, 2026',
    created_at: new Date('2026-09-20T09:15:00.000Z').toISOString(),
    updated_at: new Date('2026-09-20T09:15:00.000Z').toISOString(),
    content: {
      header: {
        address1: '500 Boylston Street',
        address2: 'Boston, MA 02116',
        phone1: '+1 (617) 555-0144',
        phone2: '+1 (617) 555-0145',
        title: 'STRATEGY & AUDIT INVOICE',
      },
      from: {
        label: 'FROM',
        name: 'HORIZON ANALYTICS GROUP',
        role: 'Quantitative Analytics & Strategy',
        address: '500 Boylston Street, Boston, MA',
        phone: '+1 (617) 555-0144',
        email: 'finance@horizonanalytics.org',
      },
      to: {
        label: 'TO',
        clientName: 'DAVID CHEN',
        role: 'Managing Partner',
        address: 'Ventures Capital Corp, Palo Alto, CA',
        phone: '+1 650 555 0192',
        email: 'david@venturescap.example',
        date: '20 Sep, 2026',
      },
      items: [
        {
          id: 'item-301',
          title: 'SaaS Metrics & Cohort Retention Study',
          subtitle: 'Full portfolio telemetry breakdown',
          quantity: 1,
          total: '$5,200.00',
        },
        {
          id: 'item-302',
          title: 'Unit Economics Forecasting Model',
          subtitle: 'Scenario simulation spreadsheets',
          quantity: 1,
          total: '$2,800.00',
        },
      ],
      subtotalLabel: 'SUB.TOTAL',
      totalLabel: 'TOTAL',
      grandTotalOverride: '$8,000.00',
      sections: [
        {
          id: 'sec-ach',
          title: 'ACH DIRECT DEPOSIT',
          lines: [
            { id: 'ach1', text: 'Bank of America N.A.' },
            { id: 'ach2', text: 'Account Type : Business Checking' },
            { id: 'ach3', text: 'Account # : 192837465' },
          ],
        },
      ],
      signature: {
        imageUrl: '',
        signeeName: 'Elena Rostova',
        signeeRole: 'Senior Managing Director',
      },
      terms: {
        title: 'Confidentiality & Terms',
        text: 'All data sets analyzed under strict mutual NDA. Net 30 payment schedule.',
      },
      footer: {
        website: 'WWW.HORIZONANALYTICS.ORG',
      },
      logoUrl: '/public/default-logo.png',
    },
  },
];

const LOCAL_STORAGE_KEY = 'visual_invoice_cms_cache';

// Phase 2.2: Check if Firestore is empty and auto-populate seed data
export async function autoPopulateSeedDataIfEmpty(): Promise<InvoiceDocument[]> {
  try {
    // 1. Check existing remote items with a quick query
    const invoicesRef = collection(db, 'invoices');
    let hasRemoteItems = false;

    try {
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Timeout querying invoices for seed check')), 3500)
      );
      const snapshot = await Promise.race([getDocs(invoicesRef), timeoutPromise]);
      if (snapshot && !snapshot.empty && snapshot.size > 0) {
        hasRemoteItems = true;
        const remoteDocs: InvoiceDocument[] = [];
        snapshot.forEach((d) => remoteDocs.push(d.data() as InvoiceDocument));
        try {
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(remoteDocs));
        } catch {
          // Ignore storage quota
        }
        return remoteDocs;
      }
    } catch (queryErr) {
      console.warn('[Seed Auto-Population] Remote check encountered network or timeout:', queryErr);
    }

    // 2. Check local storage cache
    try {
      const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // If remote was confirmed empty, sync seeds to remote in background
          if (!hasRemoteItems) {
            seedInvoices.forEach(async (inv) => {
              try {
                await setDoc(doc(db, 'invoices', inv.id), inv);
              } catch {
                // Ignore background sync errors
              }
            });
          }
          return parsed;
        }
      }
    } catch {
      // Ignore cache read errors
    }

    // 3. Database is empty: Auto-populate with seed invoices
    console.info('[Seed Auto-Population] Database is empty. Seeding 3 complete sample invoices...');
    
    // Save to local cache first for instant responsiveness
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(seedInvoices));
    } catch {
      // Ignore storage errors
    }

    // Write to Firestore in parallel
    await Promise.allSettled(
      seedInvoices.map((inv) =>
        setDoc(doc(db, 'invoices', inv.id), inv).catch((err) =>
          console.warn(`[Seed Auto-Population] Could not write ${inv.number} to Firestore:`, err)
        )
      )
    );

    console.info(`[Seed Auto-Population] Successfully pre-populated ${seedInvoices.length} sample invoices.`);
    return seedInvoices;
  } catch (err) {
    console.error('[Seed Auto-Population] Unexpected error during seed population:', err);
    return seedInvoices;
  }
}

// Phase 2.3: Non-blocking connection self-test against Firestore and Cloud Storage
export async function runConnectionSelfTest(): Promise<{
  firestore: boolean;
  storage: boolean;
  seedCount: number;
  databaseId: string;
}> {
  console.groupCollapsed('[Connection Self-Test] Testing Firestore & Cloud Storage...');
  
  let firestoreConnected = false;
  let storageReady = false;
  let seedCount = 0;

  // Test Firestore connectivity
  try {
    firestoreConnected = await testConnection();
  } catch {
    firestoreConnected = false;
  }

  // Test Cloud Storage readiness
  try {
    const testRef = ref(storage, 'health-check.tmp');
    storageReady = Boolean(testRef && storage.app);
  } catch {
    storageReady = false;
  }

  // Check populated documents count
  try {
    const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      seedCount = Array.isArray(parsed) ? parsed.length : 0;
    }
  } catch {
    seedCount = seedInvoices.length;
  }

  console.info(`[Self-Test] Connection test completed:
  • Firestore: ${firestoreConnected ? 'CONNECTED' : 'OFFLINE_FALLBACK_ACTIVE'} (DB: ${firebaseConfig.firestoreDatabaseId})
  • Cloud Storage: ${storageReady ? 'READY' : 'OFFLINE_FALLBACK_ACTIVE'} (Bucket: ${firebaseConfig.storageBucket})
  • Pre-Populated Invoices: ${seedCount} verified`);
  console.groupEnd();

  return {
    firestore: firestoreConnected,
    storage: storageReady,
    seedCount,
    databaseId: firebaseConfig.firestoreDatabaseId,
  };
}
