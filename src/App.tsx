import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ChevronLeft,
  Save,
  RotateCcw,
  RotateCw,
  Copy,
  Trash2,
  Printer,
  Maximize2,
  ZoomIn,
  ZoomOut,
  Check,
  Loader2,
  FileText,
  AlertCircle,
  PanelLeftClose,
  PanelLeft,
  Search,
  Plus,
  ChevronRight,
  Sun,
  Moon,
} from 'lucide-react';
import { InvoiceDocument, InvoiceContent } from './types';
import {
  getInvoices,
  saveInvoice,
  createInvoice,
  duplicateInvoice,
  deleteInvoice,
  seedInitialInvoiceIfEmpty,
} from './services/invoiceService';
import { InvoiceCanvas, parseCurrencyAmount, formatCurrencyAmount } from './components/InvoiceCanvas';
import { Dashboard } from './components/Dashboard';
import { cn } from './lib/utils';

const DESIGN_WIDTH = 800;
const DESIGN_HEIGHT = 1130;

export default function App() {
  // Navigation: 'dashboard' | 'editor'
  const [currentView, setCurrentView] = useState<'dashboard' | 'editor'>('dashboard');

  // Invoices state
  const [invoices, setInvoices] = useState<InvoiceDocument[]>([]);
  const [currentInvoice, setCurrentInvoice] = useState<InvoiceDocument | null>(null);
  const [loading, setLoading] = useState(true);

  // Editor Sidebar toggle
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [sidebarSearch, setSidebarSearch] = useState('');
  const [canvasTheme, setCanvasTheme] = useState<'light' | 'dark'>('light');

  // Delete modal state
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // Save status
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'dirty' | 'error'>('saved');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Undo / Redo history for current invoice content
  const [undoStack, setUndoStack] = useState<InvoiceContent[]>([]);
  const [redoStack, setRedoStack] = useState<InvoiceContent[]>([]);

  // Viewport scaling
  const viewportWrapperRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState<number>(1);
  const [zoomMode, setZoomMode] = useState<'fit' | 'custom'>('fit');
  const [customZoom, setCustomZoom] = useState<number>(1);

  // Load initial invoices from Firestore
  const loadInvoices = useCallback(async () => {
    setLoading(true);
    try {
      let list = await getInvoices();
      if (list.length === 0) {
        // Seed default invoice from screenshot
        const seeded = await seedInitialInvoiceIfEmpty();
        list = [seeded];
      }
      setInvoices(list);
    } catch (err: any) {
      console.error('Failed to load invoices from Firestore:', err);
      setErrorMessage('Could not load invoices from Firestore. Check connection.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInvoices();
  }, [loadInvoices]);

  // Viewport scale calculator: min(viewportWidth / designWidth, viewportHeight / designHeight)
  const calculateScale = useCallback(() => {
    if (zoomMode === 'custom') {
      setScale(customZoom);
      return;
    }

    if (!viewportWrapperRef.current) return;
    const wrapper = viewportWrapperRef.current;
    const padX = 24;
    const padY = 20;

    const availWidth = Math.max(100, wrapper.clientWidth - padX);
    const availHeight = Math.max(100, wrapper.clientHeight - padY);

    const computedScale = Math.min(
      availWidth / DESIGN_WIDTH,
      availHeight / DESIGN_HEIGHT
    );

    // Limit scale between 0.2 (tiny phone) and 1.3
    const clampedScale = Math.max(0.2, Math.min(1.3, computedScale));
    setScale(clampedScale);
  }, [zoomMode, customZoom]);

  // Recalculate scale on resize, orientation change, content change, or sidebar toggle
  useEffect(() => {
    calculateScale();
    const handleResize = () => calculateScale();
    const handleOrientation = () => {
      setTimeout(calculateScale, 200);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleOrientation);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleOrientation);
    };
  }, [calculateScale, currentInvoice?.content, isSidebarOpen]);

  // Switch to Invoice Editor and reset undo/redo stacks
  const handleOpenInvoice = (invoiceId: string) => {
    const found = invoices.find((inv) => inv.id === invoiceId);
    if (found) {
      setCurrentInvoice(JSON.parse(JSON.stringify(found)));
      setUndoStack([]); // Reset history when switching
      setRedoStack([]);
      setSaveStatus('saved');
      setCurrentView('editor');
    }
  };

  // Create new invoice in Firestore
  const handleCreateNewInvoice = async () => {
    setLoading(true);
    try {
      const nextNum = `INV-${new Date().getFullYear()}-${String(invoices.length + 1).padStart(3, '0')}`;
      const created = await createInvoice({ number: nextNum });
      setInvoices((prev) => [created, ...prev]);
      setCurrentInvoice(created);
      setUndoStack([]);
      setRedoStack([]);
      setSaveStatus('saved');
      setCurrentView('editor');
    } catch (err: any) {
      console.error('Error creating invoice:', err);
      setErrorMessage('Failed to create invoice in Firestore');
    } finally {
      setLoading(false);
    }
  };

  // Duplicate an invoice
  const handleDuplicateInvoice = async (sourceInvoice: InvoiceDocument) => {
    setLoading(true);
    try {
      const duplicated = await duplicateInvoice(sourceInvoice);
      setInvoices((prev) => [duplicated, ...prev]);
      setCurrentInvoice(duplicated);
      setUndoStack([]);
      setRedoStack([]);
      setSaveStatus('saved');
      setCurrentView('editor');
    } catch (err: any) {
      console.error('Error duplicating invoice:', err);
      setErrorMessage('Failed to duplicate invoice');
    } finally {
      setLoading(false);
    }
  };

  // Delete an invoice
  const handleDeleteInvoice = async (invoiceId: string) => {
    try {
      await deleteInvoice(invoiceId);
      setInvoices((prev) => prev.filter((inv) => inv.id !== invoiceId));
      if (currentInvoice?.id === invoiceId) {
        const remaining = invoices.filter((inv) => inv.id !== invoiceId);
        if (remaining.length > 0) {
          setCurrentInvoice(remaining[0]);
          setUndoStack([]);
          setRedoStack([]);
          setSaveStatus('saved');
        } else {
          setCurrentInvoice(null);
          setCurrentView('dashboard');
        }
      }
      setDeleteTargetId(null);
    } catch (err: any) {
      console.error('Error deleting invoice:', err);
      setErrorMessage('Failed to delete invoice');
    }
  };

  // Save current invoice to Firestore
  const handleSaveCurrentInvoice = async () => {
    if (!currentInvoice) return;
    setSaveStatus('saving');
    try {
      await saveInvoice(currentInvoice);
      setInvoices((prev) =>
        prev.map((inv) => (inv.id === currentInvoice.id ? currentInvoice : inv))
      );
      setSaveStatus('saved');
    } catch (err: any) {
      console.error('Error saving invoice:', err);
      setSaveStatus('error');
      setErrorMessage('Failed to save to Firestore.');
    }
  };

  // Content change handler with Undo / Redo tracking
  const handleContentChange = (newContent: InvoiceContent) => {
    if (!currentInvoice) return;

    // Push previous content state to undo stack
    setUndoStack((prev) => [...prev.slice(-40), currentInvoice.content]);
    setRedoStack([]); // Clear redo stack on new edit

    setCurrentInvoice((prev) => (prev ? { ...prev, content: newContent } : null));
    setSaveStatus('dirty');
  };

  // Number change handler
  const handleNumberChange = (newNumber: string) => {
    if (!currentInvoice) return;
    setCurrentInvoice((prev) => (prev ? { ...prev, number: newNumber } : null));
    setSaveStatus('dirty');
  };

  // Undo action
  const handleUndo = useCallback(() => {
    if (undoStack.length === 0 || !currentInvoice) return;
    const previous = undoStack[undoStack.length - 1];
    const newUndoStack = undoStack.slice(0, -1);

    setRedoStack((prev) => [...prev, currentInvoice.content]);
    setUndoStack(newUndoStack);
    setCurrentInvoice((prev) => (prev ? { ...prev, content: previous } : null));
    setSaveStatus('dirty');
  }, [undoStack, currentInvoice]);

  // Redo action
  const handleRedo = useCallback(() => {
    if (redoStack.length === 0 || !currentInvoice) return;
    const next = redoStack[redoStack.length - 1];
    const newRedoStack = redoStack.slice(0, -1);

    setUndoStack((prev) => [...prev, currentInvoice.content]);
    setRedoStack(newRedoStack);
    setCurrentInvoice((prev) => (prev ? { ...prev, content: next } : null));
    setSaveStatus('dirty');
  }, [redoStack, currentInvoice]);

  // Keyboard shortcuts (Undo: Cmd/Ctrl+Z, Redo: Cmd/Ctrl+Shift+Z or Ctrl+Y, Save: Cmd/Ctrl+S)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (currentView !== 'editor') return;

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

      if (cmdOrCtrl && !e.shiftKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        handleUndo();
      } else if (
        (cmdOrCtrl && e.shiftKey && e.key.toLowerCase() === 'z') ||
        (cmdOrCtrl && e.key.toLowerCase() === 'y')
      ) {
        e.preventDefault();
        handleRedo();
      } else if (cmdOrCtrl && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSaveCurrentInvoice();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentView, handleUndo, handleRedo, currentInvoice]);

  // Print invoice
  const handlePrint = () => {
    window.print();
  };

  const filteredSidebarInvoices = invoices.filter((inv) => {
    const term = sidebarSearch.toLowerCase();
    return (
      (inv.number || '').toLowerCase().includes(term) ||
      (inv.client_name || '').toLowerCase().includes(term)
    );
  });

  return (
    <div className="w-screen h-screen flex flex-col bg-[#09090b] overflow-hidden text-zinc-100 select-none">
      {/* Toast Error Banner */}
      {errorMessage && (
        <div className="bg-red-950/90 border-b border-red-800 text-red-200 text-xs py-2 px-4 flex items-center justify-between z-50">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-red-300 hover:text-white text-xs font-medium px-2 py-0.5"
          >
            ✕
          </button>
        </div>
      )}

      {/* DASHBOARD VIEW */}
      {currentView === 'dashboard' && (
        <Dashboard
          invoices={invoices}
          onOpenInvoice={handleOpenInvoice}
          onCreateInvoice={handleCreateNewInvoice}
          onDuplicateInvoice={handleDuplicateInvoice}
          onDeleteInvoice={handleDeleteInvoice}
          loading={loading}
        />
      )}

      {/* EDITOR VIEW (shadcn minimal design with collapsible sidebar) */}
      {currentView === 'editor' && currentInvoice && (
        <div className="w-full h-full flex flex-col overflow-hidden">
          {/* Top Minimal Header (shadcn exact styling) */}
          <header className="editor-toolbar h-13 border-b border-zinc-800 bg-[#09090b] px-4 flex items-center justify-between shrink-0 z-30 select-none">
            {/* Left Controls: Sidebar toggle, Dashboard link, Breadcrumbs */}
            <div className="flex items-center gap-2.5">
              {/* Sidebar toggle button */}
              <button
                onClick={() => {
                  setIsSidebarOpen((prev) => !prev);
                  setTimeout(calculateScale, 100);
                }}
                className={cn(
                  'h-8 w-8 inline-flex items-center justify-center rounded-md border border-zinc-800 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors cursor-pointer',
                  isSidebarOpen && 'bg-zinc-800 text-zinc-100'
                )}
                title={isSidebarOpen ? 'Hide invoice list sidebar' : 'Show invoice list sidebar'}
              >
                {isSidebarOpen ? (
                  <PanelLeftClose className="w-4 h-4" />
                ) : (
                  <PanelLeft className="w-4 h-4" />
                )}
              </button>

              <button
                onClick={() => {
                  if (saveStatus === 'dirty') {
                    handleSaveCurrentInvoice();
                  }
                  setCurrentView('dashboard');
                }}
                className="h-8 px-2.5 inline-flex items-center gap-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60 rounded-md transition-colors cursor-pointer"
                title="Back to all invoices"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Invoices</span>
              </button>

              <ChevronRight className="w-3.5 h-3.5 text-zinc-600" />

              {/* Invoice Number & Client */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-medium text-zinc-100 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded">
                  {currentInvoice.number}
                </span>
                <span className="text-xs text-zinc-400 truncate max-w-[120px] sm:max-w-[200px]">
                  {currentInvoice.content.to.clientName || 'Untitled'}
                </span>
              </div>
            </div>

            {/* Center Controls: Undo / Redo & Save status (shadcn badge & button) */}
            <div className="flex items-center gap-2">
              <div className="flex items-center border border-zinc-800 rounded-md p-0.5 bg-zinc-950">
                <button
                  onClick={handleUndo}
                  disabled={undoStack.length === 0}
                  className="h-7 w-7 inline-flex items-center justify-center text-zinc-400 hover:text-zinc-100 disabled:opacity-20 rounded-xs hover:bg-zinc-800 transition-colors cursor-pointer"
                  title="Undo (Ctrl+Z)"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={handleRedo}
                  disabled={redoStack.length === 0}
                  className="h-7 w-7 inline-flex items-center justify-center text-zinc-400 hover:text-zinc-100 disabled:opacity-20 rounded-xs hover:bg-zinc-800 transition-colors cursor-pointer"
                  title="Redo (Ctrl+Y)"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Status Indicator */}
              <div className="hidden sm:flex items-center">
                {saveStatus === 'saved' && (
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    Saved
                  </span>
                )}
                {saveStatus === 'dirty' && (
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                    Unsaved
                  </span>
                )}
              </div>

              {/* Save Button */}
              <button
                onClick={handleSaveCurrentInvoice}
                disabled={saveStatus === 'saving'}
                className={cn(
                  'h-8 px-3 text-xs font-medium rounded-md inline-flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs',
                  saveStatus === 'dirty'
                    ? 'bg-zinc-100 text-zinc-900 hover:bg-zinc-200'
                    : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800'
                )}
                title="Save document to Firestore (Ctrl+S)"
              >
                {saveStatus === 'saving' ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-400" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>Save</span>
                  </>
                )}
              </button>
            </div>

            {/* Right Controls: Zoom, Duplicate, Print, Delete */}
            <div className="flex items-center gap-1.5">
              {/* Zoom Controls */}
              <div className="hidden md:flex items-center border border-zinc-800 rounded-md p-0.5 bg-zinc-950 text-zinc-400">
                <button
                  onClick={() => {
                    setZoomMode('fit');
                    setTimeout(calculateScale, 50);
                  }}
                  className={cn(
                    'h-7 w-7 inline-flex items-center justify-center rounded-xs transition-colors cursor-pointer',
                    zoomMode === 'fit' ? 'bg-zinc-800 text-zinc-100' : 'hover:text-zinc-200'
                  )}
                  title="Fit Viewport (Zero Scrolling)"
                >
                  <Maximize2 className="w-3 h-3" />
                </button>
                <button
                  onClick={() => {
                    setZoomMode('custom');
                    setCustomZoom((prev) => Math.min(1.5, prev + 0.1));
                  }}
                  className="h-7 w-7 inline-flex items-center justify-center rounded-xs hover:text-zinc-100 hover:bg-zinc-800 transition-colors cursor-pointer"
                  title="Zoom In"
                >
                  <ZoomIn className="w-3 h-3" />
                </button>
                <button
                  onClick={() => {
                    setZoomMode('custom');
                    setCustomZoom((prev) => Math.max(0.4, prev - 0.1));
                  }}
                  className="h-7 w-7 inline-flex items-center justify-center rounded-xs hover:text-zinc-100 hover:bg-zinc-800 transition-colors cursor-pointer"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-3 h-3" />
                </button>
                <span className="px-1.5 text-[10px] font-mono text-zinc-500">
                  {Math.round(scale * 100)}%
                </span>
              </div>

              {/* Canvas Theme Toggle */}
              <button
                onClick={() => setCanvasTheme((prev) => (prev === 'light' ? 'dark' : 'light'))}
                className="h-8 w-8 inline-flex items-center justify-center rounded-md border border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 transition-colors cursor-pointer"
                title={canvasTheme === 'light' ? 'Switch to Dark Canvas' : 'Switch to Light Canvas'}
              >
                {canvasTheme === 'light' ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
              </button>

              {/* Duplicate Button */}
              <button
                onClick={() => handleDuplicateInvoice(currentInvoice)}
                className="h-8 w-8 inline-flex items-center justify-center rounded-md border border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 transition-colors cursor-pointer"
                title="Duplicate invoice"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>

              {/* Print Button */}
              <button
                onClick={handlePrint}
                className="h-8 w-8 inline-flex items-center justify-center rounded-md border border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 transition-colors cursor-pointer"
                title="Print / Export to PDF"
              >
                <Printer className="w-3.5 h-3.5" />
              </button>

              {/* Delete Button */}
              <button
                onClick={() => setDeleteTargetId(currentInvoice.id)}
                className="h-8 w-8 inline-flex items-center justify-center rounded-md border border-zinc-800 hover:bg-red-950/40 hover:border-red-900/50 text-zinc-400 hover:text-red-400 transition-colors cursor-pointer"
                title="Delete invoice"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </header>

          {/* MAIN WORKSPACE: Collapsible Minimal List Sidebar + Invoice Scaler */}
          <div className="flex-1 w-full flex overflow-hidden relative">
            {/* COLLAPSIBLE MINIMAL LIST SIDEBAR (shadcn style) */}
            {isSidebarOpen && (
              <aside className="w-64 border-r border-zinc-800 bg-[#09090b] flex flex-col shrink-0 z-20 transition-all duration-200">
                {/* Sidebar Header */}
                <div className="p-3 border-b border-zinc-800 flex items-center justify-between">
                  <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                    Documents ({invoices.length})
                  </div>
                  <button
                    onClick={handleCreateNewInvoice}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-zinc-300 hover:text-zinc-100 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 px-2 py-1 rounded transition-colors cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>New</span>
                  </button>
                </div>

                {/* Sidebar Search */}
                <div className="p-2 border-b border-zinc-800/80">
                  <div className="relative">
                    <Search className="w-3 h-3 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search..."
                      value={sidebarSearch}
                      onChange={(e) => setSidebarSearch(e.target.value)}
                      className="w-full h-7 bg-zinc-900/70 border border-zinc-800 rounded pl-7 pr-2 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-600"
                    />
                  </div>
                </div>

                {/* Minimal Document List */}
                <div className="flex-1 overflow-y-auto divide-y divide-zinc-900 p-1">
                  {filteredSidebarInvoices.map((inv) => {
                    const isActive = inv.id === currentInvoice.id;
                    const totalDisplay = inv.content?.grandTotalOverride
                      ? inv.content.grandTotalOverride
                      : formatCurrencyAmount(
                          (inv.content?.items || []).reduce(
                            (acc, i) => acc + parseCurrencyAmount(i.total),
                            0
                          )
                        );

                    return (
                      <button
                        key={inv.id}
                        onClick={() => handleOpenInvoice(inv.id)}
                        className={cn(
                          'w-full text-left p-2.5 rounded-md transition-colors flex flex-col gap-1 cursor-pointer',
                          isActive
                            ? 'bg-zinc-800/90 text-zinc-100 font-medium'
                            : 'hover:bg-zinc-900/60 text-zinc-400 hover:text-zinc-200'
                        )}
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span
                            className={cn(
                              'font-mono font-medium',
                              isActive ? 'text-zinc-100' : 'text-zinc-300'
                            )}
                          >
                            {inv.number}
                          </span>
                          <span className="font-mono text-[11px] text-zinc-400">
                            {totalDisplay}
                          </span>
                        </div>
                        <div className="text-[11px] truncate text-zinc-400">
                          {inv.client_name || inv.content?.to?.clientName || 'Unnamed'}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </aside>
            )}

            {/* INVOICE CANVAS WORKSPACE: Zero horizontal or vertical scrolling */}
            <div
              id="invoice-viewport-wrapper"
              ref={viewportWrapperRef}
              className="flex-1 h-full overflow-hidden flex items-center justify-center p-2 sm:p-4 bg-[#09090b]"
            >
              {/* The scaled box matching exact computed pixel boundaries */}
              <div
                id="invoice-scaler-box"
                style={{
                  width: `${DESIGN_WIDTH * scale}px`,
                  height: `${DESIGN_HEIGHT * scale}px`,
                  position: 'relative',
                  overflow: 'visible',
                }}
                className="flex items-start justify-center transition-all duration-75"
              >
                {/* Inner container applying the JS-computed transform: scale() */}
                <div
                  style={{
                    width: `${DESIGN_WIDTH}px`,
                    transform: `scale(${scale})`,
                    transformOrigin: 'top left',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                  }}
                >
                  <InvoiceCanvas
                    content={currentInvoice.content}
                    invoiceId={currentInvoice.id}
                    invoiceNumber={currentInvoice.number}
                    theme={canvasTheme}
                    onChange={handleContentChange}
                    onNumberChange={handleNumberChange}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MINIMAL SHADCN DELETE CONFIRMATION DIALOG */}
      {deleteTargetId && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-5 max-w-sm w-full shadow-2xl space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-zinc-100">Delete invoice?</h3>
              <p className="text-xs text-zinc-400 mt-1">
                This action cannot be undone. This invoice will be permanently removed from your Firestore database.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setDeleteTargetId(null)}
                className="h-8 px-3 text-xs font-medium rounded-md border border-zinc-800 hover:bg-zinc-800 text-zinc-300 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteInvoice(deleteTargetId)}
                className="h-8 px-3 text-xs font-medium rounded-md bg-red-600 hover:bg-red-500 text-white transition-colors cursor-pointer shadow-xs"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
