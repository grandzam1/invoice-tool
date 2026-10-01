import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, type ReactNode } from 'react';
import { InvoiceContent, InvoiceDocument } from '../types';

export type SaveStatus = 'saved' | 'saving' | 'dirty' | 'error';

type HistorySnapshot = {
  content: InvoiceContent;
  editor2?: InvoiceDocument['editor2'];
  number: string;
  client_name: string;
  date: string;
};

type Stacks = {
  undo: HistorySnapshot[];
  redo: HistorySnapshot[];
};

type DraftState = {
  drafts: Record<string, InvoiceDocument>;
  stacks: Record<string, Stacks>;
  status: Record<string, SaveStatus>;
  activeId: string | null;
};

type DraftAction =
  | { type: 'open'; server: InvoiceDocument; session: InvoiceDocument | null }
  | { type: 'edit'; next: InvoiceDocument }
  | { type: 'replace'; next: InvoiceDocument }
  | { type: 'undo' }
  | { type: 'redo' }
  | { type: 'saving'; id: string }
  | { type: 'saved'; id: string; saved: InvoiceDocument }
  | { type: 'error'; id: string }
  | { type: 'forget'; id: string };

const emptyStacks = (): Stacks => ({ undo: [], redo: [] });

function draftKey(id: string): string {
  return `invoice-draft:${id}`;
}

export function readSessionDraft(id: string): InvoiceDocument | null {
  try {
    const raw = sessionStorage.getItem(draftKey(id));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as InvoiceDocument;
    if (!parsed || parsed.id !== id || !parsed.content) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeSessionDraft(invoice: InvoiceDocument): void {
  try {
    sessionStorage.setItem(draftKey(invoice.id), JSON.stringify(invoice));
  } catch {
    // A large signature can exceed sessionStorage. The in-memory draft still holds the edit.
  }
}

export function clearSessionDraft(id: string): void {
  try {
    sessionStorage.removeItem(draftKey(id));
  } catch {
    // Ignore storage failures.
  }
}

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

function reducer(state: DraftState, action: DraftAction): DraftState {
  switch (action.type) {
    case 'open': {
      const id = action.server.id;
      if (state.drafts[id]) return { ...state, activeId: id };
      const next = action.session ?? action.server;
      return {
        ...state,
        activeId: id,
        drafts: { ...state.drafts, [id]: next },
        stacks: { ...state.stacks, [id]: state.stacks[id] ?? emptyStacks() },
        status: { ...state.status, [id]: action.session ? 'dirty' : 'saved' },
      };
    }
    case 'edit': {
      const id = action.next.id;
      const current = state.drafts[id];
      const stacks = state.stacks[id] ?? emptyStacks();
      return {
        ...state,
        activeId: id,
        drafts: { ...state.drafts, [id]: action.next },
        status: { ...state.status, [id]: 'dirty' },
        stacks: {
          ...state.stacks,
          [id]: current
            ? { undo: [...stacks.undo.slice(-40), snapshotOf(current)], redo: [] }
            : stacks,
        },
      };
    }
    case 'replace': {
      const id = action.next.id;
      return {
        ...state,
        activeId: id,
        drafts: { ...state.drafts, [id]: action.next },
        status: { ...state.status, [id]: 'dirty' },
        stacks: { ...state.stacks, [id]: state.stacks[id] ?? emptyStacks() },
      };
    }
    case 'undo':
    case 'redo': {
      if (!state.activeId) return state;
      const id = state.activeId;
      const invoice = state.drafts[id];
      const stacks = state.stacks[id] ?? emptyStacks();
      if (!invoice) return state;
      const from = action.type === 'undo' ? stacks.undo : stacks.redo;
      if (from.length === 0) return state;
      const applied = from[from.length - 1];
      const next = withSnapshot(invoice, applied);
      const recorded = snapshotOf(invoice);
      return {
        ...state,
        drafts: { ...state.drafts, [id]: next },
        status: { ...state.status, [id]: 'dirty' },
        stacks: {
          ...state.stacks,
          [id]: action.type === 'undo'
            ? { undo: stacks.undo.slice(0, -1), redo: [...stacks.redo, recorded] }
            : { undo: [...stacks.undo, recorded], redo: stacks.redo.slice(0, -1) },
        },
      };
    }
    case 'saving':
      return { ...state, status: { ...state.status, [action.id]: 'saving' } };
    case 'saved': {
      const current = state.drafts[action.id];
      const unchanged = current != null && JSON.stringify(current) === JSON.stringify(action.saved);
      return {
        ...state,
        status: { ...state.status, [action.id]: unchanged ? 'saved' : 'dirty' },
      };
    }
    case 'error':
      return { ...state, status: { ...state.status, [action.id]: 'error' } };
    case 'forget': {
      const drafts = { ...state.drafts };
      const stacks = { ...state.stacks };
      const status = { ...state.status };
      delete drafts[action.id];
      delete stacks[action.id];
      delete status[action.id];
      return {
        drafts,
        stacks,
        status,
        activeId: state.activeId === action.id ? null : state.activeId,
      };
    }
    default:
      return state;
  }
}

const initialState: DraftState = {
  drafts: {},
  stacks: {},
  status: {},
  activeId: null,
};

interface InvoiceDraftContextValue {
  active: InvoiceDocument | null;
  undoStack: HistorySnapshot[];
  redoStack: HistorySnapshot[];
  saveStatus: SaveStatus;
  open: (server: InvoiceDocument) => void;
  edit: (next: InvoiceDocument) => void;
  replace: (next: InvoiceDocument) => void;
  undo: () => void;
  redo: () => void;
  markSaving: (id: string) => void;
  markSaved: (saved: InvoiceDocument) => void;
  markError: (id: string) => void;
  forget: (id: string) => void;
}

const InvoiceDraftContext = createContext<InvoiceDraftContextValue | null>(null);

export function InvoiceDraftProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    for (const [id, invoice] of Object.entries(state.drafts)) {
      const status = state.status[id];
      if (status === 'saved') clearSessionDraft(id);
      else if (status === 'dirty' || status === 'saving' || status === 'error') writeSessionDraft(invoice);
    }
  }, [state.drafts, state.status]);

  const open = useCallback((server: InvoiceDocument) => {
    dispatch({ type: 'open', server, session: readSessionDraft(server.id) });
  }, []);
  const edit = useCallback((next: InvoiceDocument) => dispatch({ type: 'edit', next }), []);
  const replace = useCallback((next: InvoiceDocument) => dispatch({ type: 'replace', next }), []);
  const undo = useCallback(() => dispatch({ type: 'undo' }), []);
  const redo = useCallback(() => dispatch({ type: 'redo' }), []);
  const markSaving = useCallback((id: string) => dispatch({ type: 'saving', id }), []);
  const markSaved = useCallback((saved: InvoiceDocument) => dispatch({ type: 'saved', id: saved.id, saved }), []);
  const markError = useCallback((id: string) => dispatch({ type: 'error', id }), []);
  const forget = useCallback((id: string) => {
    clearSessionDraft(id);
    dispatch({ type: 'forget', id });
  }, []);

  const active = state.activeId ? state.drafts[state.activeId] ?? null : null;
  const stacks = state.activeId ? state.stacks[state.activeId] ?? emptyStacks() : emptyStacks();
  const saveStatus = state.activeId ? state.status[state.activeId] ?? 'saved' : 'saved';

  const value = useMemo<InvoiceDraftContextValue>(() => ({
    active,
    undoStack: stacks.undo,
    redoStack: stacks.redo,
    saveStatus,
    open,
    edit,
    replace,
    undo,
    redo,
    markSaving,
    markSaved,
    markError,
    forget,
  }), [active, stacks.undo, stacks.redo, saveStatus, open, edit, replace, undo, redo, markSaving, markSaved, markError, forget]);

  return <InvoiceDraftContext.Provider value={value}>{children}</InvoiceDraftContext.Provider>;
}

export function useInvoiceDraft(): InvoiceDraftContextValue {
  const value = useContext(InvoiceDraftContext);
  if (!value) throw new Error('useInvoiceDraft must be used within InvoiceDraftProvider');
  return value;
}
