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
  MoreVertical,
  MoreHorizontal,
} from 'lucide-react';
import { InvoiceDocument, InvoiceContent } from './types';
import { EditorMode, readEditorMode, writeEditorMode } from './config/editorMode';
import {
  getInvoices,
  saveInvoice,
  createInvoice,
  duplicateInvoice,
  deleteInvoice,
  seedInitialInvoiceIfEmpty,
  autoPopulateSeedDataIfEmpty,
  runConnectionSelfTest,
} from './services/invoiceService';
import { InvoiceCanvas, parseCurrencyAmount, formatCurrencyAmount } from './components/InvoiceCanvas';
import { TemplatePreview, TemplatePreviewHandle } from './components/TemplatePreview';
import { Editor2Host } from './components/Editor2Host';
import { EditorSettings } from './components/EditorSettings';
import { Dashboard } from './components/Dashboard';
import { cn } from './lib/utils';

const DESIGN_WIDTH = 800;
const DESIGN_MIN_HEIGHT = 1130;

type HistorySnapshot = {
  content: InvoiceContent;
  editor2?: InvoiceDocument['editor2'];
  number: string;
  client_name: string;
  date: string;
};

function snapshotOf(invoice: InvoiceDocument): HistorySnapshot {
  return {
    content: invoice.content,
    editor2: invoice.editor2,
    number: invoice.number,
    client_name: invoice.client_name,
    date: invoice.date,
  };
}

function withSnapshot(invoice: InvoiceDocument, snapshot: HistorySnapshot): InvoiceDocument {
  return {
    ...invoice,
    content: snapshot.content,
    editor2: snapshot.editor2,
    number: snapshot.number,
    client_name: snapshot.client_name,
    date: snapshot.date,
  };
}

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
  const [isEditorMenuOpen, setIsEditorMenuOpen] = useState(false);
  const [templatePreviewOpen, setTemplatePreviewOpen] = useState(false);
  const [editorMode, setEditorMode] = useState<EditorMode>(() => readEditorMode());
  const previewRef = useRef<TemplatePreviewHandle>(null);

  // Save status
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'dirty' | 'error'>('saved');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Undo / Redo history for current invoice content
  const [undoStack, setUndoStack] = useState<HistorySnapshot[]>([]);
  const [redoStack, setRedoStack] = useState<HistorySnapshot[]>([]);

  // Viewport scaling & dynamic height
  const viewportWrapperRef = useRef<HTMLDivElement>(null);
  const sheetInnerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState<number>(1);
  const [canvasHeight, setCanvasHeight] = useState<number>(DESIGN_MIN_HEIGHT);
  const [zoomMode, setZoomMode] = useState<'fit' | 'custom'>('fit');
  const [customZoom, setCustomZoom] = useState<number>(1);

  // Load initial invoices from Firestore or Seed Auto-Population
  const loadInvoices = useCallback(async () => {
    setLoading(true);
    try {
      let list = await getInvoices();
      if (list.length === 0) {
        // Auto-populate 2–3 complete sample invoices when database is empty
        list = await autoPopulateSeedDataIfEmpty();
      }
      setInvoices(list);
      setErrorMessage(null);
    } catch (err: any) {
      console.warn('Network delay loading remote invoices, fallback to seed:', err);
      const seeded = await autoPopulateSeedDataIfEmpty();
      setInvoices(seeded);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInvoices();
    // Phase 2.3: Non-blocking connection self-test against Firestore and Cloud Storage
    runConnectionSelfTest();
  }, [loadInvoices]);

  // Dynamically observe and measure canvas height as content expands
  useEffect(() => {
    const el = sheetInnerRef.current;
    if (!el) return;

    const measureHeight = () => {
      if (el) {
        const measured = Math.max(DESIGN_MIN_HEIGHT, el.scrollHeight, el.offsetHeight);
        setCanvasHeight(measured);
      }
    };

    measureHeight();

    const resizeObserver = new ResizeObserver(() => {
      measureHeight();
    });

    resizeObserver.observe(el);

    return () => {
      resizeObserver.disconnect();
    };
  }, [currentInvoice?.content]);

  // Width is fixed to DESIGN_WIDTH (800px). Scale down on mobile/narrow screens to prevent any horizontal clipping
  const calculateScale = useCallback(() => {
    if (zoomMode === 'custom') {
      setScale(customZoom);
      return;
    }

    if (!viewportWrapperRef.current) return;
    const wrapper = viewportWrapperRef.current;

    const rect = wrapper.getBoundingClientRect();
    const isMobile = window.innerWidth < 640;

    // Pad 16px total on mobile (8px each side), 32px on desktop (16px each side)
    const padX = isMobile ? 16 : 32;

    // Scrollbar safety: if container has vertical scrollbar, reserve 16px to prevent horizontal clipping
    const scrollbarSafety = wrapper.scrollHeight > wrapper.clientHeight ? 16 : 0;

    const availWidth = Math.max(50, rect.width - padX - scrollbarSafety);

    // Keep width fixed to 800px on desktop; scale down proportionally on narrow screens
    const computedScale = Math.min(1, availWidth / DESIGN_WIDTH);
    // Allow scaling down to whatever mobile screens need (down to 0.15)
    setScale(Math.max(0.15, computedScale));
  }, [zoomMode, customZoom]);

  // Recalculate scale on resize, orientation change, or container resize
  useEffect(() => {
    if (currentView !== 'editor') return;
    const wrapper = viewportWrapperRef.current;
    if (!wrapper) return;

    calculateScale();

    const resizeObserver = new ResizeObserver(() => {
      calculateScale();
    });

    resizeObserver.observe(wrapper);

    const handleResize = () => calculateScale();
    const handleOrientation = () => {
      setTimeout(calculateScale, 150);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleOrientation);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleOrientation);
    };
  }, [currentView, calculateScale, isSidebarOpen, editorMode]);

  // Switch to Invoice Editor and reset undo/redo stacks
  const handleOpenInvoice = (invoiceId: string) => {
    const found = invoices.find((inv) => inv.id === invoiceId);
    if (found) {
      setCurrentInvoice(JSON.parse(JSON.stringify(found)));
      setUndoStack([]); // Reset history when switching
      setRedoStack([]);
      setSaveStatus('saved');
      if (window.innerWidth < 768) {
        setIsSidebarOpen(false);
      }
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
      if (window.innerWidth < 768) {
        setIsSidebarOpen(false);
      }
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
      if (window.innerWidth < 768) {
        setIsSidebarOpen(false);
      }
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

    // Push previous document state so editor2 tax and items survive undo
    setUndoStack((prev) => [...prev.slice(-40), snapshotOf(currentInvoice)]);
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

    setRedoStack((prev) => [...prev, snapshotOf(currentInvoice)]);
    setUndoStack(newUndoStack);
    setCurrentInvoice((prev) => (prev ? withSnapshot(prev, previous) : null));
    setSaveStatus('dirty');
  }, [undoStack, currentInvoice]);

  // Redo action
  const handleRedo = useCallback(() => {
    if (redoStack.length === 0 || !currentInvoice) return;
    const next = redoStack[redoStack.length - 1];
    const newRedoStack = redoStack.slice(0, -1);

    setUndoStack((prev) => [...prev, snapshotOf(currentInvoice)]);
    setRedoStack(newRedoStack);
    setCurrentInvoice((prev) => (prev ? withSnapshot(prev, next) : null));
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

  const handleEditor2Change = (next: InvoiceDocument) => {
    if (!currentInvoice) return;
    setUndoStack((prev) => [...prev.slice(-40), snapshotOf(currentInvoice)]);
    setRedoStack([]);
    setCurrentInvoice(next);
    setSaveStatus('dirty');
  };

  const handleEditorModeChange = (next: EditorMode) => {
    setEditorMode(next);
    writeEditorMode(next);
  };

  // Print invoice. Editor 2 prints the preview iframe; classic prints the canvas.
  const handlePrint = () => {
    if (editorMode === 'editor2') {
      previewRef.current?.print();
      return;
    }
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
    <div className={cn('w-screen h-screen flex flex-col bg-[#09090b] overflow-hidden text-zinc-100 select-none', editorMode === 'editor2' && 'editor-mode-editor2')}>
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
          <header className="editor-toolbar h-13 border-b border-zinc-800 bg-[#09090b] px-3 sm:px-4 flex items-center justify-between shrink-0 z-30 select-none">
            {/* Left Controls: Sidebar toggle, Dashboard link, Breadcrumbs */}
            <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
              {/* Sidebar toggle button (desktop only) */}
              <button
                onClick={() => {
                  setIsSidebarOpen((prev) => !prev);
                  setTimeout(calculateScale, 100);
                }}
                className={cn(
                  'hidden md:inline-flex h-8 w-8 items-center justify-center rounded-md border border-zinc-800 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors cursor-pointer',
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

              {/* Back button (< Invoices) - always visible */}
              <button
                onClick={() => {
                  if (saveStatus === 'dirty') {
                    handleSaveCurrentInvoice();
                  }
                  setCurrentView('dashboard');
                }}
                className="h-8 px-2 sm:px-2.5 inline-flex items-center gap-1 text-xs font-medium text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60 rounded-md transition-colors cursor-pointer shrink-0"
                title="Back to all invoices"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Invoices</span>
              </button>

              <ChevronRight className="hidden md:inline-block w-3.5 h-3.5 text-zinc-600 shrink-0" />

              {/* Invoice ID Title (INV-2026-005) & Client name on desktop */}
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs font-mono font-medium text-zinc-100 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded shrink-0">
                  {currentInvoice.number}
                </span>
                <span className="hidden md:inline text-xs text-zinc-400 truncate max-w-[200px]">
                  {currentInvoice.content.to.clientName || 'Untitled'}
                </span>
              </div>
            </div>

            {/* Desktop Center Controls: Undo / Redo, Status indicator, Save button */}
            <div className="hidden md:flex items-center gap-2">
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

              {/* Desktop Status Indicator */}
              <div className="flex items-center">
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

              {/* Desktop Save Button */}
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

            {/* Right Controls: Desktop all inline / Mobile Save + ... overflow menu */}
            <div className="flex items-center gap-1.5">
              <EditorSettings
                value={editorMode}
                onChange={handleEditorModeChange}
                className="hidden md:inline-flex"
              />
              <button
                type="button"
                onClick={() => setTemplatePreviewOpen((prev) => !prev)}
                className="lg:hidden h-8 px-2.5 text-xs font-medium rounded-md inline-flex items-center border border-zinc-800 bg-zinc-900 text-zinc-200 hover:bg-zinc-800 transition-colors cursor-pointer shrink-0"
                aria-pressed={templatePreviewOpen}
              >
                {templatePreviewOpen ? 'Close preview' : 'Preview'}
              </button>
              {/* Mobile Save Button (visible on mobile only, beside the ... menu icon) */}
              <button
                onClick={handleSaveCurrentInvoice}
                disabled={saveStatus === 'saving'}
                className={cn(
                  'md:hidden h-8 px-2.5 text-xs font-medium rounded-md inline-flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs shrink-0',
                  saveStatus === 'dirty'
                    ? 'bg-zinc-100 text-zinc-900 hover:bg-zinc-200'
                    : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800'
                )}
                title="Save document (Ctrl+S)"
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

              {/* Desktop Zoom Controls (+, -, 100%, fullscreen toggle) */}
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
                  title="Zoom In (+)"
                >
                  <ZoomIn className="w-3 h-3" />
                </button>
                <button
                  onClick={() => {
                    setZoomMode('custom');
                    setCustomZoom((prev) => Math.max(0.4, prev - 0.1));
                  }}
                  className="h-7 w-7 inline-flex items-center justify-center rounded-xs hover:text-zinc-100 hover:bg-zinc-800 transition-colors cursor-pointer"
                  title="Zoom Out (-)"
                >
                  <ZoomOut className="w-3 h-3" />
                </button>
                <span className="px-1.5 text-[10px] font-mono text-zinc-500">
                  {Math.round(scale * 100)}%
                </span>
              </div>

              {/* Desktop Canvas Theme Toggle */}
              <button
                onClick={() => setCanvasTheme((prev) => (prev === 'light' ? 'dark' : 'light'))}
                className="hidden md:inline-flex h-8 w-8 items-center justify-center rounded-md border border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 transition-colors cursor-pointer"
                title={canvasTheme === 'light' ? 'Switch to Dark Canvas' : 'Switch to Light Canvas'}
              >
                {canvasTheme === 'light' ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
              </button>

              {/* Desktop Duplicate Button */}
              <button
                onClick={() => handleDuplicateInvoice(currentInvoice)}
                className="hidden md:inline-flex h-8 w-8 items-center justify-center rounded-md border border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 transition-colors cursor-pointer"
                title="Duplicate invoice"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>

              {/* Desktop Print Button */}
              <button
                onClick={handlePrint}
                className="hidden md:inline-flex h-8 w-8 items-center justify-center rounded-md border border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 transition-colors cursor-pointer"
                title="Print / Export to PDF"
              >
                <Printer className="w-3.5 h-3.5" />
              </button>

              {/* Desktop Delete Button */}
              <button
                onClick={() => setDeleteTargetId(currentInvoice.id)}
                className="hidden md:inline-flex h-8 w-8 items-center justify-center rounded-md border border-zinc-800 hover:bg-red-950/40 hover:border-red-900/50 text-zinc-400 hover:text-red-400 transition-colors cursor-pointer"
                title="Delete invoice"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>

              {/* Mobile ... Overflow Menu: Collapsed on screens < md: */}
              <div className="relative md:hidden">
                <button
                  onClick={() => setIsEditorMenuOpen((prev) => !prev)}
                  className={cn(
                    'h-8 w-8 inline-flex items-center justify-center rounded-md border border-zinc-800 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors cursor-pointer',
                    isEditorMenuOpen && 'bg-zinc-800 text-zinc-100'
                  )}
                  title="Overflow menu"
                  aria-label="Overflow menu"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </button>

                {isEditorMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40 bg-black/50 backdrop-blur-2xs"
                      onClick={() => setIsEditorMenuOpen(false)}
                    />
                    <div className="absolute right-0 top-10 z-50 w-60 bg-zinc-950 border border-zinc-800 rounded-lg shadow-2xl p-2 space-y-2">
                      <div className="px-2.5 py-1.5 bg-zinc-900/60 rounded-md border border-zinc-800/80">
                        <EditorSettings
                          value={editorMode}
                          onChange={(mode) => {
                            handleEditorModeChange(mode);
                            setIsEditorMenuOpen(false);
                          }}
                          className="w-full justify-between"
                        />
                      </div>

                      {/* Status indicator inside overflow menu */}
                      <div className="flex items-center justify-between px-2.5 py-1.5 bg-zinc-900/60 rounded-md border border-zinc-800/80 text-xs">
                        <span className="text-zinc-400">Status</span>
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
                        {saveStatus === 'saving' && (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-zinc-500/10 text-zinc-400 border border-zinc-500/20">
                            <Loader2 className="w-3 h-3 animate-spin text-zinc-400" />
                            Saving...
                          </span>
                        )}
                        {saveStatus === 'error' && (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-red-500/10 text-red-400 border border-red-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                            Error
                          </span>
                        )}
                      </div>

                      {/* Zoom Controls (+, -, 100%) */}
                      <div className="px-2.5 py-1.5 bg-zinc-900/60 rounded-md border border-zinc-800/80 space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-zinc-400">Zoom</span>
                          <span className="font-mono text-zinc-300 font-medium">
                            {Math.round(scale * 100)}%
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-1 pt-0.5">
                          <button
                            onClick={() => {
                              setZoomMode('custom');
                              setCustomZoom((prev) => Math.max(0.4, prev - 0.1));
                            }}
                            className="flex-1 py-1 px-2 text-xs inline-flex items-center justify-center gap-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
                            title="Zoom Out (-)"
                          >
                            <ZoomOut className="w-3 h-3" />
                            <span>-</span>
                          </button>
                          <button
                            onClick={() => {
                              setZoomMode('custom');
                              setCustomZoom((prev) => Math.min(1.5, prev + 0.1));
                            }}
                            className="flex-1 py-1 px-2 text-xs inline-flex items-center justify-center gap-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
                            title="Zoom In (+)"
                          >
                            <ZoomIn className="w-3 h-3" />
                            <span>+</span>
                          </button>
                        </div>
                      </div>

                      {/* Fullscreen Toggle */}
                      <button
                        onClick={() => {
                          setZoomMode('fit');
                          setTimeout(calculateScale, 50);
                          setIsEditorMenuOpen(false);
                        }}
                        className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs text-zinc-300 hover:text-zinc-100 hover:bg-zinc-900 rounded-md transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <Maximize2 className="w-3.5 h-3.5" />
                          <span>Fullscreen Toggle</span>
                        </div>
                        {zoomMode === 'fit' && <span className="text-[10px] text-emerald-400 font-medium">Fit Active</span>}
                      </button>

                      {/* Theme Toggle */}
                      <button
                        onClick={() => {
                          setCanvasTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
                          setIsEditorMenuOpen(false);
                        }}
                        className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs text-zinc-300 hover:text-zinc-100 hover:bg-zinc-900 rounded-md transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          {canvasTheme === 'light' ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
                          <span>Canvas Theme</span>
                        </div>
                        <span className="text-[11px] text-zinc-400 capitalize">{canvasTheme}</span>
                      </button>

                      {/* Duplicate Action */}
                      <button
                        onClick={() => {
                          handleDuplicateInvoice(currentInvoice);
                          setIsEditorMenuOpen(false);
                        }}
                        className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-zinc-300 hover:text-zinc-100 hover:bg-zinc-900 rounded-md transition-colors cursor-pointer"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>Duplicate</span>
                      </button>

                      {/* Print Action */}
                      <button
                        onClick={() => {
                          handlePrint();
                          setIsEditorMenuOpen(false);
                        }}
                        className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-zinc-300 hover:text-zinc-100 hover:bg-zinc-900 rounded-md transition-colors cursor-pointer"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Print</span>
                      </button>

                      {/* Delete Action */}
                      <div className="border-t border-zinc-800/80 pt-1">
                        <button
                          onClick={() => {
                            setDeleteTargetId(currentInvoice.id);
                            setIsEditorMenuOpen(false);
                          }}
                          className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-red-400 hover:text-red-300 hover:bg-red-950/30 rounded-md transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </header>

          {/* MAIN WORKSPACE: Collapsible Minimal List Sidebar + Invoice Scaler */}
          <div className="flex-1 w-full flex overflow-hidden relative">
            {/* COLLAPSIBLE MINIMAL LIST SIDEBAR (shadcn style) */}
            {isSidebarOpen && (
              <>
                {/* Mobile Backdrop */}
                <div
                  className="fixed inset-0 z-30 bg-black/60 backdrop-blur-xs md:hidden"
                  onClick={() => setIsSidebarOpen(false)}
                />
                <aside className="fixed inset-y-0 left-0 z-40 w-64 md:relative md:z-20 border-r border-zinc-800 bg-[#09090b] flex flex-col shrink-0 shadow-2xl md:shadow-none transition-all duration-200">
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
              </>
            )}

            {/* INVOICE CANVAS WORKSPACE: Scroll vertically with fixed width and expanding height */}
            <div
              id="invoice-viewport-wrapper"
              ref={viewportWrapperRef}
              style={editorMode === 'editor2' ? { display: 'none' } : undefined}
              className="flex-1 w-full h-full overflow-y-auto overflow-x-hidden flex justify-center items-start py-4 sm:py-8 px-2 sm:px-4 bg-[#09090b]"
            >
              {/* The scaled box matching exact computed pixel boundaries */}
              <div
                id="invoice-scaler-box"
                style={{
                  width: `${DESIGN_WIDTH * scale}px`,
                  maxWidth: '100%',
                  height: `${canvasHeight * scale}px`,
                  minHeight: `${canvasHeight * scale}px`,
                  position: 'relative',
                  flexShrink: 0,
                  marginBottom: '3rem',
                }}
                className="transition-all duration-75"
              >
                {/* Inner container applying the JS-computed transform: scale() */}
                <div
                  ref={sheetInnerRef}
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
            {editorMode === 'editor2' && (
              <Editor2Host
                invoice={currentInvoice}
                invoices={invoices}
                onChange={handleEditor2Change}
                onDuplicate={() => handleDuplicateInvoice(currentInvoice)}
                onDelete={() => handleDeleteInvoice(currentInvoice.id)}
                onBack={() => {
                  if (saveStatus === 'dirty') handleSaveCurrentInvoice();
                  setCurrentView('dashboard');
                }}
                onSave={handleSaveCurrentInvoice}
                onUndo={handleUndo}
                onRedo={handleRedo}
              />
            )}
            <TemplatePreview
              ref={previewRef}
              invoice={currentInvoice}
              open={templatePreviewOpen}
              onClose={() => setTemplatePreviewOpen(false)}
            />
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
