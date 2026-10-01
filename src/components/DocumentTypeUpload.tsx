import { useState } from 'react';
import { authHeaders } from '../firebase';
import { DocumentField } from '../templates/documentFields';

interface DocumentTypeUploadProps {
  onUploaded: (id: string) => void;
}

function slug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function isField(value: unknown): value is DocumentField {
  if (!value || typeof value !== 'object') return false;
  const field = value as DocumentField;
  return typeof field.key === 'string' && typeof field.label === 'string';
}

export function DocumentTypeUpload({ onUploaded }: DocumentTypeUploadProps) {
  const [manifestFile, setManifestFile] = useState<File | null>(null);
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const upload = async () => {
    if (!manifestFile || !templateFile) {
      setError('Choose manifest.json and template.html.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const manifest = JSON.parse(await manifestFile.text()) as {
        name?: string;
        fields?: unknown;
        themes?: unknown;
      };
      const html = await templateFile.text();
      const fields = Array.isArray(manifest.fields) ? manifest.fields.filter(isField) : [];
      const themes = Array.isArray(manifest.themes) ? manifest.themes.filter((theme) => typeof theme === 'string') : [];
      const lineItems = fields.some((field) => Array.isArray(field.repeat) && field.repeat.length > 0);
      if (!manifest.name || fields.length === 0 || themes.length === 0 || !lineItems) {
        setError('manifest.json needs a name, a field list, theme names, and one line item group.');
        return;
      }
      if (!html.includes('{{') || !html.includes('data-repeat="items"')) {
        setError('template.html needs {{placeholders}} and one sample row.');
        return;
      }
      const id = slug(manifest.name);
      const response = await fetch('/api/document-types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
        body: JSON.stringify({ id, name: manifest.name, fields, themes, html }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null) as { error?: string } | null;
        setError(body?.error || 'Save failed.');
        return;
      }
      onUploaded(id);
    } catch {
      setError('Could not read those files.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-0 min-w-0 max-w-full flex-1 overflow-y-auto overflow-x-hidden bg-[#09090b] text-zinc-100 flex items-start justify-center p-8">
      <form
        className="w-full max-w-md space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          void upload();
        }}
      >
        <label className="block space-y-1">
          <span className="text-[11px] text-zinc-400">manifest.json</span>
          <input
            type="file"
            accept="application/json,.json"
            aria-label="manifest.json"
            onChange={(event) => setManifestFile(event.target.files?.[0] || null)}
            className="block w-full text-xs text-zinc-300"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-[11px] text-zinc-400">template.html</span>
          <input
            type="file"
            accept="text/html,.html"
            aria-label="template.html"
            onChange={(event) => setTemplateFile(event.target.files?.[0] || null)}
            className="block w-full text-xs text-zinc-300"
          />
        </label>
        {error && <p className="text-xs text-red-300">{error}</p>}
        <button
          type="submit"
          disabled={saving}
          className="h-8 px-3 text-xs font-medium rounded-md bg-zinc-100 text-zinc-900 cursor-pointer disabled:opacity-50"
        >
          {saving ? 'Saving' : 'Upload'}
        </button>
      </form>
    </div>
  );
}
