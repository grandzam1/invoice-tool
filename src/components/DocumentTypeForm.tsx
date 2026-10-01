import { DocumentField, DocumentItemRow } from '../templates/documentFields';

interface DocumentTypeFormProps {
  name: string;
  fields: DocumentField[];
  values: Record<string, string>;
  items: DocumentItemRow[];
  onChange: (values: Record<string, string>, items: DocumentItemRow[]) => void;
}

export function DocumentTypeForm({ name, fields, values, items, onChange }: DocumentTypeFormProps) {
  const repeatField = fields.find((field) => Array.isArray(field.repeat) && field.repeat.length > 0);
  const columns = repeatField?.repeat || ['description', 'price', 'qty'];

  const addRow = () => {
    const blank: Record<string, string> = {};
    for (const column of columns) blank[column] = column === 'qty' ? '1' : '';
    onChange(values, [...items, { id: crypto.randomUUID(), values: blank }]);
  };

  const removeRow = (id: string) => {
    onChange(values, items.filter((item) => item.id !== id));
  };

  return (
    <form
      className="w-[340px] shrink-0 h-full overflow-y-auto border-r border-zinc-800 bg-[#09090b] px-3 py-3 space-y-3"
      onSubmit={(event) => event.preventDefault()}
    >
      <div className="text-[11px] uppercase tracking-wider text-zinc-500">{name}</div>
      {fields.filter((field) => !field.repeat).map((field) => {
        const long = field.key === 'terms' || field.key === 'bank_code';
        return (
          <label key={field.key} className="block space-y-1">
            <span className="text-[11px] text-zinc-400">{field.label}</span>
            {long ? (
              <textarea
                value={values[field.key] || ''}
                rows={field.key === 'terms' ? 4 : 3}
                onChange={(event) => onChange({ ...values, [field.key]: event.target.value }, items)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-2 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-zinc-600"
              />
            ) : (
              <input
                value={values[field.key] || ''}
                onChange={(event) => onChange({ ...values, [field.key]: event.target.value }, items)}
                className="w-full h-8 bg-zinc-900 border border-zinc-800 rounded-md px-2 text-xs text-zinc-100 focus:outline-none focus:border-zinc-600"
              />
            )}
          </label>
        );
      })}

      {repeatField && (
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-zinc-400">{repeatField.label}</span>
            <button
              type="button"
              onClick={addRow}
              className="h-7 px-2 text-[11px] font-medium rounded-md border border-zinc-800 text-zinc-300 hover:bg-zinc-800 cursor-pointer"
            >
              Add row
            </button>
          </div>
          {items.map((item, index) => (
            <div key={item.id} className="space-y-1 rounded-md border border-zinc-800 p-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-zinc-500">Row {index + 1}</span>
                <button
                  type="button"
                  onClick={() => removeRow(item.id)}
                  className="text-[11px] text-zinc-400 hover:text-red-300 cursor-pointer"
                >
                  Remove
                </button>
              </div>
              {columns.map((column) => (
                <input
                  key={column}
                  aria-label={`${column} ${index + 1}`}
                  value={item.values[column] || ''}
                  onChange={(event) => {
                    const nextItems = items.map((row) =>
                      row.id === item.id
                        ? { ...row, values: { ...row.values, [column]: event.target.value } }
                        : row,
                    );
                    onChange(values, nextItems);
                  }}
                  placeholder={column}
                  className="w-full h-8 bg-zinc-950 border border-zinc-800 rounded-md px-2 text-xs text-zinc-100 focus:outline-none focus:border-zinc-600"
                />
              ))}
            </div>
          ))}
        </div>
      )}
    </form>
  );
}
