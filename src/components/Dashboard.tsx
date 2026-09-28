import React, { useState, useEffect } from 'react';
import {
  Plus,
  FileText,
  Copy,
  Trash2,
  ExternalLink,
  Search,
  Database,
  Calendar,
  User,
  SlidersHorizontal,
  LayoutList,
  LayoutGrid,
  CheckCircle2,
  Clock,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  Menu,
  Check,
} from 'lucide-react';
import { InvoiceDocument } from '../types';
import { parseCurrencyAmount, formatCurrencyAmount } from './InvoiceCanvas';
import { cn } from '../lib/utils';

interface DashboardProps {
  invoices: InvoiceDocument[];
  onOpenInvoice: (invoiceId: string) => void;
  onCreateInvoice: () => void;
  onDuplicateInvoice: (invoice: InvoiceDocument) => void;
  onDeleteInvoice: (invoiceId: string) => void;
  loading: boolean;
}

export const Dashboard: React.FC<DashboardProps> = ({
  invoices,
  onOpenInvoice,
  onCreateInvoice,
  onDuplicateInvoice,
  onDeleteInvoice,
  loading,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const ITEMS_PER_PAGE = 7;

  // Reset to first page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const filteredInvoices = invoices.filter((inv) => {
    const term = searchTerm.toLowerCase();
    const num = (inv.number || '').toLowerCase();
    const client = (inv.client_name || '').toLowerCase();
    const date = (inv.date || '').toLowerCase();
    return num.includes(term) || client.includes(term) || date.includes(term);
  });

  // Pagination calculation
  const totalItems = filteredInvoices.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));
  const activePage = Math.min(Math.max(1, currentPage), totalPages);

  const startIndex = (activePage - 1) * ITEMS_PER_PAGE;
  const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, totalItems);
  const displayedInvoices = filteredInvoices.slice(startIndex, endIndex);

  const startItem = totalItems === 0 ? 0 : startIndex + 1;
  const endItem = endIndex;

  const getInvoiceTotal = (inv: InvoiceDocument): string => {
    if (inv.content?.grandTotalOverride) {
      return inv.content.grandTotalOverride;
    }
    const sum = (inv.content?.items || []).reduce((acc, item) => {
      return acc + parseCurrencyAmount(item.total);
    }, 0);
    return formatCurrencyAmount(sum);
  };

  const formatDate = (isoString?: string) => {
    if (!isoString) return 'Just now';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="w-full h-full bg-[#09090b] text-zinc-100 flex flex-col overflow-y-auto">
      {/* Top Minimal Navigation Bar (shadcn style) */}
      <header className="border-b border-zinc-800 bg-[#09090b]/80 backdrop-blur-sm sticky top-0 z-30 px-4 md:px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="w-8 h-8 rounded-md bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-100 shadow-xs">
            <FileText className="w-4 h-4 text-zinc-200" />
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="text-sm font-semibold text-zinc-100 tracking-tight">Invoices</span>
            <span className="hidden sm:inline text-xs font-normal text-zinc-500 font-mono">/ CMS</span>
            <span className="hidden md:inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-zinc-900 text-zinc-400 border border-zinc-800">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Firestore
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Desktop Secondary Buttons: Visible on desktop (md: and up) */}
          <div className="hidden md:flex items-center gap-2">
            {/* View mode toggle */}
            <div className="flex items-center border border-zinc-800 rounded-md p-0.5 bg-zinc-950">
              <button
                onClick={() => setViewMode('list')}
                className={cn(
                  'p-1.5 rounded-xs transition-colors cursor-pointer',
                  viewMode === 'list'
                    ? 'bg-zinc-800 text-zinc-100'
                    : 'text-zinc-500 hover:text-zinc-300'
                )}
                title="Minimal Table List"
              >
                <LayoutList className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={cn(
                  'p-1.5 rounded-xs transition-colors cursor-pointer',
                  viewMode === 'grid'
                    ? 'bg-zinc-800 text-zinc-100'
                    : 'text-zinc-500 hover:text-zinc-300'
                )}
                title="Grid Cards"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Mobile Secondary Menu: Collapsed into a menu icon on mobile screens (< md:) */}
          <div className="relative md:hidden">
            <button
              onClick={() => setIsMobileMenuOpen((prev) => !prev)}
              className={cn(
                'h-8 w-8 inline-flex items-center justify-center rounded-md border border-zinc-800 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors cursor-pointer',
                isMobileMenuOpen && 'bg-zinc-800 text-zinc-100'
              )}
              title="Secondary options"
              aria-label="Secondary options"
            >
              <Menu className="w-4 h-4" />
            </button>

            {isMobileMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40 bg-black/40 backdrop-blur-2xs"
                  onClick={() => setIsMobileMenuOpen(false)}
                />
                <div className="absolute right-0 top-10 z-50 w-48 bg-zinc-950 border border-zinc-800 rounded-lg shadow-2xl p-1.5 space-y-1">
                  <div className="px-2 py-1 text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
                    View Layout
                  </div>
                  <button
                    onClick={() => {
                      setViewMode('list');
                      setIsMobileMenuOpen(false);
                    }}
                    className={cn(
                      'w-full flex items-center justify-between px-2.5 py-1.5 text-xs rounded-md transition-colors cursor-pointer',
                      viewMode === 'list'
                        ? 'bg-zinc-800 text-zinc-100 font-medium'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <LayoutList className="w-3.5 h-3.5" />
                      <span>Table List</span>
                    </div>
                    {viewMode === 'list' && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                  </button>
                  <button
                    onClick={() => {
                      setViewMode('grid');
                      setIsMobileMenuOpen(false);
                    }}
                    className={cn(
                      'w-full flex items-center justify-between px-2.5 py-1.5 text-xs rounded-md transition-colors cursor-pointer',
                      viewMode === 'grid'
                        ? 'bg-zinc-800 text-zinc-100 font-medium'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <LayoutGrid className="w-3.5 h-3.5" />
                      <span>Grid Cards</span>
                    </div>
                    {viewMode === 'grid' && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                  </button>

                  <div className="border-t border-zinc-800/80 my-1 pt-1">
                    <div className="px-2.5 py-1.5 flex items-center justify-between text-[11px] text-zinc-400">
                      <span className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Firestore
                      </span>
                      <span className="text-[10px] text-zinc-500 font-mono">Sync active</span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* New Invoice Button: Simple '+' on mobile screens, '+ New Invoice' on desktop (md: and up) */}
          <button
            onClick={onCreateInvoice}
            className="inline-flex items-center justify-center bg-zinc-100 hover:bg-zinc-200 text-zinc-900 font-medium text-xs h-8 w-8 md:w-auto md:px-3 rounded-md transition-colors shadow-xs cursor-pointer shrink-0"
            title="Create New Invoice"
            aria-label="New Invoice"
          >
            <Plus className="w-4 h-4 md:w-3.5 md:h-3.5" />
            <span className="hidden md:inline ml-1.5">New Invoice</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-6 md:p-8 space-y-5">
        {/* Title & Description */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between pb-2">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-zinc-100">Documents</h1>
            <p className="text-xs text-zinc-400 mt-0.5">
              Click any invoice to edit in the visual canvas. Real-time Firestore sync.
            </p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* Search Input (shadcn input style) */}
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Filter by invoice # or client..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-8 bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700 focus:border-zinc-500 rounded-md pl-8 pr-3 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none transition-colors"
              />
            </div>
            <div className="text-xs text-zinc-500 font-mono shrink-0">
              {filteredInvoices.length} {filteredInvoices.length === 1 ? 'doc' : 'docs'}
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 text-zinc-500 gap-3 border border-zinc-800/80 rounded-lg bg-zinc-950/40">
            <div className="w-5 h-5 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs">Fetching invoices from Firestore...</span>
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredInvoices.length === 0 && (
          <div className="border border-dashed border-zinc-800 rounded-lg p-12 text-center bg-zinc-950/30">
            <FileText className="w-8 h-8 text-zinc-600 mx-auto mb-3" />
            <h3 className="text-sm font-medium text-zinc-200 mb-1">
              {searchTerm ? 'No invoices match your filter' : 'No invoices found'}
            </h3>
            <p className="text-xs text-zinc-500 mb-4 max-w-xs mx-auto">
              {searchTerm ? 'Try a different search term.' : 'Create your first invoice to get started.'}
            </p>
            <button
              onClick={onCreateInvoice}
              className="inline-flex items-center gap-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-900 font-medium text-xs h-8 px-3 rounded-md transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Invoice</span>
            </button>
          </div>
        )}

        {/* MINIMAL LIST VIEW (shadcn exact table design) */}
        {!loading && filteredInvoices.length > 0 && viewMode === 'list' && (
          <div className="border border-zinc-800 rounded-lg overflow-hidden bg-zinc-950/50 shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-zinc-800 bg-zinc-900/40 text-zinc-400 font-medium uppercase tracking-wider text-[11px]">
                    <th className="py-2.5 px-4 w-36">Invoice</th>
                    <th className="py-2.5 px-4">Client / Recipient</th>
                    <th className="py-2.5 px-4 w-32">Date</th>
                    <th className="py-2.5 px-4 w-28 text-right">Amount</th>
                    <th className="py-2.5 px-4 w-28">Status</th>
                    <th className="py-2.5 px-4 w-28 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 font-normal">
                  {displayedInvoices.map((inv) => {
                    const totalDisplay = getInvoiceTotal(inv);
                    const isConfirming = confirmDeleteId === inv.id;

                    return (
                      <tr
                        key={inv.id}
                        onClick={() => onOpenInvoice(inv.id)}
                        className="group hover:bg-zinc-900/60 transition-colors cursor-pointer"
                      >
                        {/* Invoice Number */}
                        <td className="py-3 px-4 font-mono font-medium text-zinc-100">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono bg-zinc-900 border border-zinc-800 text-zinc-200 group-hover:border-zinc-700 transition-colors">
                            {inv.number || 'INV'}
                          </span>
                        </td>

                        {/* Client details */}
                        <td className="py-3 px-4">
                          <div className="font-medium text-zinc-200 group-hover:text-white transition-colors">
                            {inv.client_name || inv.content?.to?.clientName || 'Unnamed Client'}
                          </div>
                          <div className="text-[11px] text-zinc-500 truncate max-w-xs">
                            {inv.content?.to?.role ? `${inv.content.to.role} • ` : ''}
                            {inv.content?.items?.length || 0} line item(s)
                          </div>
                        </td>

                        {/* Date */}
                        <td className="py-3 px-4 text-zinc-400 font-mono text-[11px]">
                          {inv.date || formatDate(inv.created_at)}
                        </td>

                        {/* Total Amount */}
                        <td className="py-3 px-4 text-right font-mono font-medium text-zinc-100">
                          {totalDisplay}
                        </td>

                        {/* Status */}
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <span className="w-1 h-1 rounded-full bg-emerald-400" />
                            Saved
                          </span>
                        </td>

                        {/* Actions (stop propagation to not trigger row click) */}
                        <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="inline-flex items-center gap-1">
                            <button
                              onClick={() => onOpenInvoice(inv.id)}
                              className="h-7 px-2 text-[11px] font-medium text-zinc-300 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded transition-colors"
                              title="Open Editor"
                            >
                              Edit
                            </button>

                            <button
                              onClick={() => onDuplicateInvoice(inv)}
                              className="h-7 w-7 flex items-center justify-center text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded transition-colors"
                              title="Duplicate invoice"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>

                            {isConfirming ? (
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => {
                                    onDeleteInvoice(inv.id);
                                    setConfirmDeleteId(null);
                                  }}
                                  className="h-7 px-1.5 text-[10px] font-bold bg-red-900/60 hover:bg-red-800 text-red-200 border border-red-800 rounded transition-colors"
                                >
                                  Del
                                </button>
                                <button
                                  onClick={() => setConfirmDeleteId(null)}
                                  className="h-7 px-1 text-[10px] text-zinc-400 hover:text-zinc-200"
                                >
                                  ✕
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setConfirmDeleteId(inv.id)}
                                className="h-7 w-7 flex items-center justify-center text-zinc-500 hover:text-red-400 hover:bg-red-950/30 rounded transition-colors"
                                title="Delete invoice"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination bar under the document table when there are more than 7 items */}
            {totalItems > 7 && (
              <div className="border-t border-zinc-800 px-4 py-3 bg-zinc-900/40 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-xs text-zinc-400 font-normal">
                  Showing <span className="font-medium text-zinc-200">{startItem}–{endItem}</span> of <span className="font-medium text-zinc-200">{totalItems}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={activePage === 1}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span>Previous</span>
                  </button>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={activePage === totalPages}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  >
                    <span>Next</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* MINIMAL GRID CARDS (shadcn Card style) */}
        {!loading && filteredInvoices.length > 0 && viewMode === 'grid' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {displayedInvoices.map((inv) => {
              const totalDisplay = getInvoiceTotal(inv);
              const isConfirming = confirmDeleteId === inv.id;

              return (
                <div
                  key={inv.id}
                  onClick={() => onOpenInvoice(inv.id)}
                  className="bg-zinc-950 border border-zinc-800 hover:border-zinc-700 rounded-lg p-4 flex flex-col justify-between transition-colors group cursor-pointer shadow-xs"
                >
                  <div>
                    <div className="flex items-start justify-between mb-3">
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-300">
                        {inv.number || 'INV'}
                      </span>
                      <div className="text-right font-mono font-medium text-sm text-zinc-100">
                        {totalDisplay}
                      </div>
                    </div>

                    <h2 className="text-sm font-semibold text-zinc-100 group-hover:text-zinc-50 transition-colors truncate">
                      {inv.client_name || inv.content?.to?.clientName || 'Unnamed Client'}
                    </h2>
                    <p className="text-xs text-zinc-500 mt-0.5 truncate">
                      {inv.content?.header?.title || 'PROJECT INVOICE'}
                    </p>

                    <div className="mt-4 pt-3 border-t border-zinc-900 flex items-center justify-between text-[11px] text-zinc-400 font-mono">
                      <span>{inv.date || 'No date'}</span>
                      <span>{inv.content?.items?.length || 0} items</span>
                    </div>
                  </div>

                  <div
                    className="pt-3 mt-3 border-t border-zinc-800/60 flex items-center justify-between gap-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() => onOpenInvoice(inv.id)}
                      className="text-xs font-medium text-zinc-300 hover:text-white px-2 py-1 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 transition-colors"
                    >
                      Open
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onDuplicateInvoice(inv)}
                        className="p-1 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 rounded"
                        title="Duplicate"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>

                      {isConfirming ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              onDeleteInvoice(inv.id);
                              setConfirmDeleteId(null);
                            }}
                            className="text-[10px] font-bold bg-red-900/60 hover:bg-red-800 text-red-200 px-1.5 py-0.5 rounded"
                          >
                            Del
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className="text-[10px] text-zinc-400"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDeleteId(inv.id)}
                          className="p-1 text-zinc-500 hover:text-red-400 hover:bg-zinc-900 rounded"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            </div>

            {/* Pagination bar under the grid when there are more than 7 items */}
            {totalItems > 7 && (
              <div className="border border-zinc-800 rounded-lg px-4 py-3 bg-zinc-950/50 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-xs text-zinc-400 font-normal">
                  Showing <span className="font-medium text-zinc-200">{startItem}–{endItem}</span> of <span className="font-medium text-zinc-200">{totalItems}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={activePage === 1}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span>Previous</span>
                  </button>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={activePage === totalPages}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  >
                    <span>Next</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};
