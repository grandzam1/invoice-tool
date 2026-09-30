import { EditorMode } from '../config/editorMode';
import { cn } from '../lib/utils';

interface EditorSettingsProps {
  value: EditorMode;
  onChange: (mode: EditorMode) => void;
  className?: string;
}

export function EditorSettings({ value, onChange, className }: EditorSettingsProps) {
  return (
    <label className={cn('inline-flex items-center gap-1.5 shrink-0', className)}>
      <span className="text-xs text-zinc-400">Editor</span>
      <select
        value={value}
        onChange={(event) => {
          const next = event.target.value;
          if (next === 'classic' || next === 'editor2') onChange(next);
        }}
        className="h-8 rounded-md border border-zinc-800 bg-zinc-900 px-2 text-xs font-medium text-zinc-200 outline-none hover:bg-zinc-800 focus:border-zinc-600 cursor-pointer"
        aria-label="Editor"
      >
        <option value="classic">Classic</option>
        <option value="editor2">Editor 2</option>
      </select>
    </label>
  );
}
