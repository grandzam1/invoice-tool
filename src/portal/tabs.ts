import { FileText, type LucideIcon } from 'lucide-react';

export interface PortalTab {
  key: string;
  title: string;
  url: string;
  icon: string;
}

/** Add a tab by appending one object. The bar renders only when this list has 2 or more items. */
export const PORTAL_TABS: PortalTab[] = [
  { key: 'invoices', title: 'Invoices', url: '/', icon: 'file-text' },
];

const PORTAL_TAB_ICONS: Record<string, LucideIcon> = {
  'file-text': FileText,
};

export function portalTabIcon(name: string): LucideIcon {
  return PORTAL_TAB_ICONS[name] ?? FileText;
}
