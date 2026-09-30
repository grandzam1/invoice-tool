export type EditorMode = 'editor2' | 'classic';

export const DEFAULT_EDITOR: EditorMode = 'editor2';
export const EDITOR_MODE_KEY = 'invoice-tool-editor';

export function readEditorMode(): EditorMode {
  try {
    const stored = localStorage.getItem(EDITOR_MODE_KEY);
    if (stored === 'editor2' || stored === 'classic') return stored;
  } catch {
    // Ignore storage read errors and use the default.
  }
  return DEFAULT_EDITOR;
}

export function writeEditorMode(mode: EditorMode): void {
  try {
    localStorage.setItem(EDITOR_MODE_KEY, mode);
  } catch {
    // Ignore storage write errors.
  }
}
