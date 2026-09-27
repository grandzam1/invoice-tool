import React, { useRef } from 'react';
import {
  Trash2,
  ChevronUp,
  ChevronDown,
  Plus,
  Image as ImageIcon,
  RotateCcw,
  Upload,
  X,
  CreditCard,
  FileCheck2,
} from 'lucide-react';
import { InvoiceContent, InvoiceLineItem, InvoiceSection } from '../types';
import { EditableText } from './EditableText';
import { uploadInvoiceImage } from '../services/invoiceService';
import { cn } from '../lib/utils';

interface InvoiceCanvasProps {
  content: InvoiceContent;
  invoiceId: string;
  invoiceNumber: string;
  theme?: 'light' | 'dark';
  onChange: (updatedContent: InvoiceContent) => void;
  onNumberChange?: (newNumber: string) => void;
}

export function parseCurrencyAmount(val: string | number): number {
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  const cleaned = String(val).replace(/[^0-9.-]+/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

export function formatCurrencyAmount(amount: number): string {
  return `$${amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export const InvoiceCanvas: React.FC<InvoiceCanvasProps> = ({
  content,
  invoiceId,
  invoiceNumber,
  theme = 'light',
  onChange,
  onNumberChange,
}) => {
  const logoInputRef = useRef<HTMLInputElement>(null);
  const sigInputRef = useRef<HTMLInputElement>(null);

  // Compute subtotal from line items
  const computedSubtotalNumber = content.items.reduce((acc, item) => {
    return acc + parseCurrencyAmount(item.total);
  }, 0);
  const computedSubtotal = formatCurrencyAmount(computedSubtotalNumber);

  // Grand total uses override if present, else computedSubtotal
  const displayGrandTotal =
    content.grandTotalOverride !== null && content.grandTotalOverride !== undefined
      ? content.grandTotalOverride
      : computedSubtotal;

  // Helper to trigger updates with a new content state
  const updateContent = (partial: Partial<InvoiceContent>) => {
    onChange({
      ...content,
      ...partial,
    });
  };

  // --- Line Items Handlers ---
  const handleItemChange = (index: number, field: keyof InvoiceLineItem, value: any) => {
    const updatedItems = [...content.items];
    updatedItems[index] = {
      ...updatedItems[index],
      [field]: value,
    };
    updateContent({ items: updatedItems });
  };

  const handleAddItem = () => {
    const newItem: InvoiceLineItem = {
      id: `item-${Date.now()}`,
      title: 'New Service Item',
      subtitle: 'Description / timeframe',
      quantity: 1,
      total: '$1,000.00',
    };
    updateContent({ items: [...content.items, newItem] });
  };

  const handleAddItemBelow = (index: number) => {
    const newItem: InvoiceLineItem = {
      id: `item-${Date.now()}`,
      title: 'New Service Item',
      subtitle: 'Description / timeframe',
      quantity: 1,
      total: '$1,000.00',
    };
    const updated = [...content.items];
    updated.splice(index + 1, 0, newItem);
    updateContent({ items: updated });
  };

  const handleDeleteItem = (index: number) => {
    if (content.items.length <= 1) return; // Keep at least one item
    const updated = content.items.filter((_, i) => i !== index);
    updateContent({ items: updated });
  };

  const handleMoveItem = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= content.items.length) return;
    const updated = [...content.items];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;
    updateContent({ items: updated });
  };

  // --- Payment Sections Handlers ---
  const handleSectionTitleChange = (secIndex: number, title: string) => {
    const updated = [...content.sections];
    updated[secIndex] = { ...updated[secIndex], title };
    updateContent({ sections: updated });
  };

  const handleLineChange = (secIndex: number, lineIndex: number, text: string) => {
    const updatedSections = [...content.sections];
    const section = { ...updatedSections[secIndex] };
    const lines = [...section.lines];
    lines[lineIndex] = { ...lines[lineIndex], text };
    section.lines = lines;
    updatedSections[secIndex] = section;
    updateContent({ sections: updatedSections });
  };

  const handleAddLineToSection = (secIndex: number) => {
    const updatedSections = [...content.sections];
    const section = { ...updatedSections[secIndex] };
    section.lines = [
      ...section.lines,
      { id: `line-${Date.now()}`, text: 'New account / detail line' },
    ];
    updatedSections[secIndex] = section;
    updateContent({ sections: updatedSections });
  };

  const handleDeleteLine = (secIndex: number, lineIndex: number) => {
    const updatedSections = [...content.sections];
    const section = { ...updatedSections[secIndex] };
    if (section.lines.length <= 1) return;
    section.lines = section.lines.filter((_, i) => i !== lineIndex);
    updatedSections[secIndex] = section;
    updateContent({ sections: updatedSections });
  };

  const handleAddSection = () => {
    const newSection: InvoiceSection = {
      id: `sec-${Date.now()}`,
      title: 'ADDITIONAL INFO',
      lines: [{ id: `l-${Date.now()}`, text: 'Note or instructions here' }],
    };
    updateContent({ sections: [...content.sections, newSection] });
  };

  const handleDeleteSection = (secIndex: number) => {
    if (content.sections.length <= 1) return;
    updateContent({ sections: content.sections.filter((_, i) => i !== secIndex) });
  };

  // --- Instant Image Upload Handlers ---
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 1. Instantly read as Base64 Data URL so user sees the logo immediately
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      updateContent({ logoUrl: dataUrl });

      // 2. In background, attempt to save to Firebase Storage
      try {
        const remoteUrl = await uploadInvoiceImage(invoiceId, file, 'logo');
        if (remoteUrl && remoteUrl !== dataUrl) {
          updateContent({ logoUrl: remoteUrl });
        }
      } catch (err) {
        console.warn('Retaining local Data URL for logo:', err);
      }
    };
    reader.readAsDataURL(file);

    // Reset input value so re-uploading works
    e.target.value = '';
  };

  const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 1. Instantly read as Base64 Data URL
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      updateContent({
        signature: {
          ...content.signature,
          imageUrl: dataUrl,
        },
      });

      // 2. In background, attempt Firebase Storage
      try {
        const remoteUrl = await uploadInvoiceImage(invoiceId, file, 'signature');
        if (remoteUrl && remoteUrl !== dataUrl) {
          updateContent({
            signature: {
              ...content.signature,
              imageUrl: remoteUrl,
            },
          });
        }
      } catch (err) {
        console.warn('Retaining local Data URL for signature:', err);
      }
    };
    reader.readAsDataURL(file);

    // Reset input value
    e.target.value = '';
  };

  const isDark = theme === 'dark';

  return (
    <div
      id="invoice-document-sheet"
      className={cn(
        "w-[800px] min-h-[1130px] font-sans px-12 pt-10 pb-10 relative select-text flex flex-col justify-between transition-colors",
        "border shadow-2xl rounded-xl",
        isDark
          ? "bg-zinc-950 text-zinc-100 border-zinc-800 shadow-black/80"
          : "bg-white text-zinc-900 border-zinc-200/90 shadow-2xl shadow-zinc-950/10"
      )}
      style={{ boxSizing: 'border-box' }}
    >
      {/* Hidden File Inputs */}
      <input
        ref={logoInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleLogoUpload}
      />
      <input
        ref={sigInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleSignatureUpload}
      />

      {/* TOP SECTION: Header / Contacts / Logo */}
      <div>
        <div className="flex justify-between items-start pb-8 border-b border-zinc-200/70 dark:border-zinc-800/80 mb-8">
          {/* Logo or Top Left Brand Container */}
          <div className="flex items-center gap-3">
            {content.logoUrl ? (
              <div className="relative group/logo flex items-center gap-2 p-1.5 rounded-lg border border-transparent hover:border-zinc-200 dark:hover:border-zinc-800 transition-colors">
                <img
                  src={content.logoUrl}
                  alt="Company Logo"
                  className="h-12 max-h-14 max-w-[220px] object-contain rounded-md block shadow-2xs"
                />
                <div className="flex items-center gap-1 opacity-70 hover:opacity-100 focus-within:opacity-100 transition-opacity">
                  <button
                    onClick={() => logoInputRef.current?.click()}
                    title="Change Logo"
                    className="h-7 px-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 shadow-2xs rounded text-xs text-zinc-700 dark:text-zinc-200 font-medium flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Upload className="w-3 h-3" />
                    <span>Change</span>
                  </button>
                  <button
                    onClick={() => updateContent({ logoUrl: '' })}
                    title="Remove Logo"
                    className="h-7 w-7 bg-white dark:bg-zinc-800 hover:bg-red-50 dark:hover:bg-red-950/40 border border-red-200 dark:border-red-900 shadow-2xs rounded text-red-500 hover:text-red-700 flex items-center justify-center cursor-pointer transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => logoInputRef.current?.click()}
                className={cn(
                  "h-10 px-3.5 text-xs font-medium border border-dashed rounded-lg flex items-center gap-2 cursor-pointer transition-all shadow-2xs",
                  isDark
                    ? "border-zinc-700 bg-zinc-900/50 text-zinc-300 hover:text-white hover:bg-zinc-800 hover:border-zinc-500"
                    : "border-zinc-300 bg-zinc-50/80 text-zinc-700 hover:text-zinc-950 hover:bg-zinc-100 hover:border-zinc-400"
                )}
                title="Upload custom logo from your computer"
              >
                <ImageIcon className="w-4 h-4 text-zinc-400" />
                <span>Upload Logo</span>
              </button>
            )}
          </div>

          {/* Top Right Address & Phone Block (Clean shadcn metadata) */}
          <div className="flex gap-8 text-xs leading-relaxed text-right font-normal">
            <div className={cn("flex flex-col text-left", isDark ? "text-zinc-400" : "text-zinc-600")}>
              <EditableText
                value={content.header.address1}
                onChange={(val) =>
                  updateContent({
                    header: { ...content.header, address1: val },
                  })
                }
                className="text-xs"
              />
              <EditableText
                value={content.header.address2}
                onChange={(val) =>
                  updateContent({
                    header: { ...content.header, address2: val },
                  })
                }
                className="text-xs text-zinc-500"
              />
            </div>
            <div className={cn("flex flex-col text-left font-mono", isDark ? "text-zinc-400" : "text-zinc-600")}>
              <EditableText
                value={content.header.phone1}
                onChange={(val) =>
                  updateContent({
                    header: { ...content.header, phone1: val },
                  })
                }
                className="text-xs"
              />
              <EditableText
                value={content.header.phone2}
                onChange={(val) =>
                  updateContent({
                    header: { ...content.header, phone2: val },
                  })
                }
                className="text-xs text-zinc-500"
              />
            </div>
          </div>
        </div>

        {/* MAIN TITLE: PROJECT INVOICE (shadcn Typography & Badge) */}
        <div className="mb-10 flex items-center justify-between">
          <div className="space-y-1">
            <h1 className={cn(
              "text-2xl font-bold tracking-tight uppercase",
              isDark ? "text-zinc-100" : "text-zinc-900"
            )}>
              <EditableText
                value={content.header.title}
                onChange={(val) =>
                  updateContent({
                    header: { ...content.header, title: val },
                  })
                }
                className="text-2xl font-bold tracking-tight"
              />
            </h1>
            <p className={cn("text-xs font-normal", isDark ? "text-zinc-500" : "text-zinc-500")}>
              Issued on {content.to.date || 'Recent date'}
            </p>
          </div>

          {/* Invoice Number Reference Badge */}
          {onNumberChange && (
            <div className="flex items-center gap-2">
              <span className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-mono font-medium border shadow-2xs",
                isDark
                  ? "bg-zinc-900 border-zinc-800 text-zinc-200"
                  : "bg-zinc-50 border-zinc-200 text-zinc-800"
              )}>
                <span className="text-[10px] text-zinc-400 uppercase font-sans">No.</span>
                <EditableText
                  value={invoiceNumber}
                  onChange={onNumberChange}
                  className="font-mono font-semibold text-xs"
                />
              </span>
            </div>
          )}
        </div>

        {/* MIDDLE SECTION: 2-COLUMN LAYOUT (TO on left, TABLE on right) */}
        <div className="grid grid-cols-12 gap-8 items-start mb-10">
          {/* LEFT: TO (Client Details in shadcn Card style) */}
          <div className={cn(
            "col-span-4 p-4 rounded-lg border",
            isDark ? "bg-zinc-900/40 border-zinc-800" : "bg-zinc-50/70 border-zinc-200/80"
          )}>
            <div className={cn("text-[10px] font-semibold tracking-wider uppercase mb-2", isDark ? "text-zinc-400" : "text-zinc-500")}>
              <EditableText
                value={content.to.label}
                onChange={(val) =>
                  updateContent({
                    to: { ...content.to, label: val },
                  })
                }
                className="font-semibold text-[10px] tracking-wider uppercase"
              />
            </div>

            <div className="mb-0.5">
              <EditableText
                value={content.to.clientName}
                onChange={(val) =>
                  updateContent({
                    to: { ...content.to, clientName: val },
                  })
                }
                className={cn("font-semibold text-sm tracking-tight", isDark ? "text-zinc-100" : "text-zinc-900")}
              />
            </div>

            <div className="mb-3">
              <EditableText
                value={content.to.role}
                onChange={(val) =>
                  updateContent({
                    to: { ...content.to, role: val },
                  })
                }
                className="text-zinc-500 text-xs font-normal"
              />
            </div>

            <div className={cn("space-y-1 text-xs leading-relaxed border-t pt-2.5", isDark ? "border-zinc-800 text-zinc-400" : "border-zinc-200 text-zinc-600")}>
              <div>
                <EditableText
                  value={content.to.address}
                  onChange={(val) =>
                    updateContent({
                      to: { ...content.to, address: val },
                    })
                  }
                  className="text-xs"
                />
              </div>
              <div className="font-mono text-[11px]">
                <EditableText
                  value={content.to.phone}
                  onChange={(val) =>
                    updateContent({
                      to: { ...content.to, phone: val },
                    })
                  }
                  className="text-zinc-500 text-[11px]"
                />
              </div>
              <div className="text-[11px]">
                <EditableText
                  value={content.to.email}
                  onChange={(val) =>
                    updateContent({
                      to: { ...content.to, email: val },
                    })
                  }
                  className="text-zinc-500 text-[11px]"
                />
              </div>
            </div>

            <div className="mt-3 pt-2 border-t border-zinc-200 dark:border-zinc-800 font-mono text-[11px] text-zinc-500">
              <EditableText
                value={content.to.date}
                onChange={(val) =>
                  updateContent({
                    to: { ...content.to, date: val },
                  })
                }
                className="text-zinc-500 font-mono text-[11px]"
              />
            </div>
          </div>

          {/* RIGHT: LINE ITEMS TABLE WITH DIRECT ADD & REMOVE BUTTONS */}
          <div className="col-span-8 flex flex-col">
            <div className={cn(
              "border rounded-lg overflow-hidden shadow-2xs",
              isDark ? "border-zinc-800 bg-zinc-950" : "border-zinc-200/90 bg-white"
            )}>
              {/* Table Header */}
              <div className={cn(
                "border-b py-2.5 px-4 grid grid-cols-12 text-[11px] font-medium tracking-wider uppercase items-center",
                isDark ? "bg-zinc-900/60 border-zinc-800 text-zinc-400" : "bg-zinc-50 border-zinc-200 text-zinc-500"
              )}>
                <div className="col-span-5">Item Description</div>
                <div className="col-span-2 text-right pr-2">Qty</div>
                <div className="col-span-2 text-right pr-1">Total</div>
                <div className="col-span-3 text-right">Actions</div>
              </div>

              {/* Table Rows with Clear Buttons for Adding & Removing */}
              <div className={cn("divide-y", isDark ? "divide-zinc-800/60" : "divide-zinc-100")}>
                {content.items.map((item, index) => (
                  <div
                    key={item.id}
                    className={cn(
                      "py-2.5 px-4 grid grid-cols-12 items-center transition-colors group/row",
                      isDark ? "hover:bg-zinc-900/40" : "hover:bg-zinc-50/70"
                    )}
                  >
                    {/* Title & Subtitle (col-span-5) */}
                    <div className="col-span-5 flex flex-col pr-2">
                      <EditableText
                        value={item.title}
                        onChange={(val) => handleItemChange(index, 'title', val)}
                        className={cn("font-medium text-xs tracking-tight", isDark ? "text-zinc-100" : "text-zinc-900")}
                      />
                      <EditableText
                        value={item.subtitle}
                        onChange={(val) => handleItemChange(index, 'subtitle', val)}
                        className="text-zinc-500 font-normal text-[11px]"
                      />
                    </div>

                    {/* Quantity (col-span-2) */}
                    <div className="col-span-2 text-right pr-2">
                      <EditableText
                        value={String(item.quantity)}
                        onChange={(val) => handleItemChange(index, 'quantity', val)}
                        className="text-zinc-600 dark:text-zinc-400 font-mono text-xs text-right"
                      />
                    </div>

                    {/* Item Total (col-span-2) */}
                    <div className="col-span-2 text-right pr-1">
                      <EditableText
                        value={String(item.total)}
                        onChange={(val) => handleItemChange(index, 'total', val)}
                        className={cn("font-mono font-medium text-xs text-right", isDark ? "text-zinc-100" : "text-zinc-900")}
                      />
                    </div>

                    {/* Row Action Controls: Add & Remove buttons (col-span-3) */}
                    <div className="col-span-3 flex items-center justify-end gap-1">
                      {/* Reorder Buttons */}
                      <button
                        onClick={() => handleMoveItem(index, 'up')}
                        disabled={index === 0}
                        className={cn(
                          "w-5 h-6 flex items-center justify-center rounded border transition-colors cursor-pointer disabled:opacity-20",
                          isDark
                            ? "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200"
                            : "bg-white border-zinc-200 text-zinc-500 hover:text-zinc-950"
                        )}
                        title="Move up"
                      >
                        <ChevronUp className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => handleMoveItem(index, 'down')}
                        disabled={index === content.items.length - 1}
                        className={cn(
                          "w-5 h-6 flex items-center justify-center rounded border transition-colors cursor-pointer disabled:opacity-20",
                          isDark
                            ? "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200"
                            : "bg-white border-zinc-200 text-zinc-500 hover:text-zinc-950"
                        )}
                        title="Move down"
                      >
                        <ChevronDown className="w-3 h-3" />
                      </button>

                      {/* ADD ITEM BELOW BUTTON */}
                      <button
                        onClick={() => handleAddItemBelow(index)}
                        className={cn(
                          "h-6 px-1.5 flex items-center gap-0.5 rounded border text-[11px] font-medium transition-colors cursor-pointer",
                          isDark
                            ? "bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:text-white"
                            : "bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-100 hover:text-zinc-950"
                        )}
                        title="Add new line item below"
                      >
                        <Plus className="w-3 h-3 text-zinc-500" />
                        <span>Add</span>
                      </button>

                      {/* REMOVE ITEM BUTTON */}
                      <button
                        onClick={() => handleDeleteItem(index)}
                        disabled={content.items.length <= 1}
                        className={cn(
                          "h-6 w-6 flex items-center justify-center rounded border transition-colors cursor-pointer",
                          content.items.length <= 1
                            ? "opacity-20 cursor-not-allowed border-zinc-200 dark:border-zinc-800 text-zinc-400"
                            : isDark
                            ? "border-red-900/60 bg-red-950/30 text-red-400 hover:bg-red-950/60 hover:text-red-300"
                            : "border-red-200 bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700"
                        )}
                        title={content.items.length <= 1 ? "Cannot remove last item" : "Remove this item"}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add Line Item Button Row at Table Bottom */}
              <div className={cn("p-2 border-t flex items-center justify-between", isDark ? "border-zinc-800/80 bg-zinc-950/40" : "border-zinc-100 bg-zinc-50/30")}>
                <button
                  onClick={handleAddItem}
                  className={cn(
                    "inline-flex items-center gap-1.5 text-xs font-medium py-1 px-3 rounded-md border border-dashed transition-all cursor-pointer shadow-2xs",
                    isDark
                      ? "border-zinc-700 bg-zinc-900/40 text-zinc-300 hover:text-white hover:bg-zinc-850 hover:border-zinc-500"
                      : "border-zinc-300 bg-white text-zinc-700 hover:text-zinc-950 hover:bg-zinc-50 hover:border-zinc-400"
                  )}
                  title="Add new line item to invoice"
                >
                  <Plus className="w-3.5 h-3.5 text-zinc-400" />
                  <span>+ Add Line Item</span>
                </button>

                <div className="text-[11px] text-zinc-400 font-mono pr-2">
                  {content.items.length} {content.items.length === 1 ? 'item' : 'items'}
                </div>
              </div>
            </div>

            {/* Subtotal and Total Card (shadcn summary design) */}
            <div className={cn(
              "mt-3 p-3.5 rounded-lg border",
              isDark ? "bg-zinc-900/30 border-zinc-800" : "bg-zinc-50/60 border-zinc-200/80"
            )}>
              {/* SUB.TOTAL */}
              <div className="flex items-center justify-between py-1 text-xs">
                <span className={cn("font-medium", isDark ? "text-zinc-400" : "text-zinc-500")}>
                  <EditableText
                    value={content.subtotalLabel}
                    onChange={(val) => updateContent({ subtotalLabel: val })}
                    className="font-medium text-xs uppercase tracking-wider"
                  />
                </span>
                <span className={cn("font-mono font-medium text-xs", isDark ? "text-zinc-200" : "text-zinc-800")}>
                  {computedSubtotal}
                </span>
              </div>

              {/* Divider */}
              <div className={cn("border-t my-2", isDark ? "border-zinc-800" : "border-zinc-200")} />

              {/* TOTAL (Grand Total with override capability) */}
              <div className="flex items-center justify-between py-0.5">
                <div className="flex items-center gap-1.5">
                  <span className={cn("text-xs font-semibold uppercase tracking-wider", isDark ? "text-zinc-100" : "text-zinc-900")}>
                    <EditableText
                      value={content.totalLabel}
                      onChange={(val) => updateContent({ totalLabel: val })}
                      className="font-semibold text-xs uppercase tracking-wider"
                    />
                  </span>
                  {content.grandTotalOverride !== null && (
                    <button
                      onClick={() => updateContent({ grandTotalOverride: null })}
                      title="Reset to calculated total"
                      className="opacity-40 hover:opacity-100 p-0.5 text-zinc-400 hover:text-zinc-600 cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                    </button>
                  )}
                </div>
                <div className={cn("font-mono font-bold text-base", isDark ? "text-zinc-100" : "text-zinc-950")}>
                  <EditableText
                    value={displayGrandTotal}
                    onChange={(val) => updateContent({ grandTotalOverride: val })}
                    className="font-mono font-bold text-base text-right"
                    title="Click to edit or override grand total"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* BOTTOM SECTION: Payment Methods (Left) & Signature/Terms (Right) */}
        <div className="grid grid-cols-12 gap-8 items-start">
          {/* BOTTOM LEFT: Payment & Info Sections (shadcn Card style) */}
          <div className="col-span-5 space-y-4">
            {content.sections.map((section, secIdx) => (
              <div
                key={section.id}
                className={cn(
                  "p-3.5 rounded-lg border relative group/sec",
                  isDark ? "bg-zinc-900/40 border-zinc-800" : "bg-zinc-50/70 border-zinc-200/80"
                )}
              >
                {/* Section Header */}
                <div className={cn("pb-2 mb-2 border-b flex items-center justify-between", isDark ? "border-zinc-800" : "border-zinc-200")}>
                  <div className="flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-zinc-400" />
                    <span className={cn("text-[11px] font-semibold uppercase tracking-wider", isDark ? "text-zinc-200" : "text-zinc-800")}>
                      <EditableText
                        value={section.title}
                        onChange={(val) => handleSectionTitleChange(secIdx, val)}
                        className="font-semibold text-[11px] tracking-wider uppercase"
                      />
                    </span>
                  </div>

                  {/* Delete Section button */}
                  <div className="flex items-center gap-1 opacity-30 group-hover/sec:opacity-100 focus-within:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleDeleteSection(secIdx)}
                      className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 rounded cursor-pointer"
                      title="Delete section"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Section Lines */}
                <div className="space-y-1 text-xs">
                  {section.lines.map((line, lineIdx) => (
                    <div key={line.id} className="group/line flex items-center justify-between">
                      <EditableText
                        value={line.text}
                        onChange={(val) => handleLineChange(secIdx, lineIdx, val)}
                        className={cn("flex-1 text-xs font-mono", isDark ? "text-zinc-300" : "text-zinc-700")}
                      />
                      <button
                        onClick={() => handleDeleteLine(secIdx, lineIdx)}
                        className="opacity-30 group-hover/line:opacity-100 text-zinc-400 hover:text-red-600 p-0.5 ml-1 rounded cursor-pointer"
                        title="Remove line"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Add Line to Section button */}
                <div className="pt-2">
                  <button
                    onClick={() => handleAddLineToSection(secIdx)}
                    className="opacity-40 hover:opacity-100 focus:opacity-100 transition-opacity inline-flex items-center gap-1 text-[11px] text-zinc-500 hover:text-zinc-950 dark:hover:text-zinc-200 py-0.5 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add detail</span>
                  </button>
                </div>
              </div>
            ))}

            {/* Tap-friendly Add Section Button */}
            <button
              onClick={handleAddSection}
              className={cn(
                "opacity-40 hover:opacity-100 focus:opacity-100 transition-opacity inline-flex items-center gap-1.5 text-xs border border-dashed rounded-md px-3 py-1.5 cursor-pointer",
                isDark
                  ? "border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
                  : "border-zinc-300 text-zinc-600 hover:text-zinc-950 hover:bg-zinc-50"
              )}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Add Info / Payment Section</span>
            </button>
          </div>

          {/* BOTTOM RIGHT: Signature, Terms, Signee (shadcn style) */}
          <div className="col-span-7 flex flex-col items-end pt-1">
            {/* Signature Area */}
            <div className="flex flex-col items-center mb-6 relative group/sig">
              {content.signature.imageUrl ? (
                <div className="relative">
                  <img
                    src={content.signature.imageUrl}
                    alt="Signature"
                    className="h-14 max-w-[180px] object-contain rounded-md shadow-2xs"
                  />
                  <div className="absolute -top-2 -right-6 flex gap-1 opacity-70 group-hover/sig:opacity-100 transition-opacity">
                    <button
                      onClick={() => sigInputRef.current?.click()}
                      className="p-1 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shadow-xs rounded-full text-zinc-700 dark:text-zinc-200 hover:text-black cursor-pointer"
                      title="Change signature image"
                    >
                      <Upload className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() =>
                        updateContent({
                          signature: { ...content.signature, imageUrl: '' },
                        })
                      }
                      className="p-1 bg-white dark:bg-zinc-800 border border-red-200 dark:border-red-900 shadow-xs rounded-full text-red-500 hover:text-red-700 cursor-pointer"
                      title="Clear image (use script font)"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <div className={cn(
                    "font-['Caveat',cursive] text-3xl tracking-wide transform -rotate-1 select-none py-1",
                    isDark ? "text-zinc-200" : "text-zinc-900"
                  )}>
                    {content.signature.signeeName || 'Anthony Bourdain'}
                  </div>
                  <button
                    onClick={() => sigInputRef.current?.click()}
                    className="opacity-40 hover:opacity-100 focus:opacity-100 transition-opacity inline-flex items-center gap-1 text-[11px] text-zinc-500 hover:text-zinc-950 dark:hover:text-zinc-200 py-0.5 cursor-pointer"
                    title="Upload handwritten signature image"
                  >
                    <Upload className="w-3 h-3" />
                    <span>Upload image</span>
                  </button>
                </div>
              )}

              {/* Signee Name & Title */}
              <div className="text-center mt-1 border-t border-zinc-200 dark:border-zinc-800 pt-1.5 w-36">
                <EditableText
                  value={content.signature.signeeName}
                  onChange={(val) =>
                    updateContent({
                      signature: { ...content.signature, signeeName: val },
                    })
                  }
                  className={cn("font-medium text-xs text-center block", isDark ? "text-zinc-200" : "text-zinc-900")}
                />
                <EditableText
                  value={content.signature.signeeRole}
                  onChange={(val) =>
                    updateContent({
                      signature: { ...content.signature, signeeRole: val },
                    })
                  }
                  className="text-zinc-500 text-[11px] text-center block"
                />
              </div>
            </div>

            {/* Terms & Conditions block (shadcn Callout style) */}
            <div className={cn(
              "w-full text-left rounded-lg p-3 border",
              isDark ? "bg-zinc-900/30 border-zinc-800" : "bg-zinc-50/80 border-zinc-200/80"
            )}>
              <div className={cn("font-medium text-xs mb-1", isDark ? "text-zinc-200" : "text-zinc-900")}>
                <EditableText
                  value={content.terms.title}
                  onChange={(val) =>
                    updateContent({
                      terms: { ...content.terms, title: val },
                    })
                  }
                  className="font-medium text-xs"
                />
              </div>
              <div className={cn("text-xs leading-relaxed", isDark ? "text-zinc-400" : "text-zinc-500")}>
                <EditableText
                  value={content.terms.text}
                  onChange={(val) =>
                    updateContent({
                      terms: { ...content.terms, text: val },
                    })
                  }
                  multiline
                  className="text-xs"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FOOTER: Website Link (Bottom Right in monospace shadcn styling) */}
      <div className="flex justify-between items-center pt-6 border-t border-zinc-200/60 dark:border-zinc-800/80 text-[11px] text-zinc-400">
        <div className="flex items-center gap-1.5">
          <FileCheck2 className="w-3.5 h-3.5 text-zinc-400" />
          <span>Electronic Visual Document</span>
        </div>
        <div className="font-mono tracking-wider uppercase">
          <EditableText
            value={content.footer.website}
            onChange={(val) =>
              updateContent({
                footer: { website: val },
              })
            }
            className="font-mono tracking-wider text-[11px] text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
          />
        </div>
      </div>
    </div>
  );
};
