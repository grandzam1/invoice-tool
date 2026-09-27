import React, { useRef, useEffect } from 'react';
import { cn } from '../lib/utils';

interface EditableTextProps {
  value: string;
  onChange: (newValue: string) => void;
  className?: string;
  placeholder?: string;
  multiline?: boolean;
  style?: React.CSSProperties;
  title?: string;
}

export const EditableText: React.FC<EditableTextProps> = ({
  value,
  onChange,
  className = '',
  placeholder = 'Click to edit',
  multiline = false,
  style = {},
  title,
}) => {
  const elementRef = useRef<HTMLSpanElement>(null);
  const isComposingRef = useRef(false);

  // Sync value when prop changes from outside (e.g. undo/redo)
  useEffect(() => {
    if (elementRef.current && elementRef.current.innerText !== value) {
      elementRef.current.innerText = value;
    }
  }, [value]);

  const handleBlur = () => {
    if (!elementRef.current) return;
    const currentText = elementRef.current.innerText.trim();
    if (currentText !== value) {
      onChange(currentText);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLSpanElement>) => {
    if (!multiline && e.key === 'Enter') {
      e.preventDefault();
      elementRef.current?.blur();
    }
  };

  return (
    <span
      ref={elementRef}
      contentEditable
      suppressContentEditableWarning
      spellCheck={false}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      onCompositionStart={() => {
        isComposingRef.current = true;
      }}
      onCompositionEnd={() => {
        isComposingRef.current = false;
      }}
      data-placeholder={placeholder}
      title={title || 'Click to edit'}
      style={{
        fontSize: '16px', // Mandatory: prevents mobile Safari auto-zoom
        ...style,
      }}
      className={cn(
        'inline-block outline-none cursor-text transition-all duration-150 rounded px-1 -mx-1',
        'hover:bg-black/5 focus:bg-black/5 focus:ring-1.5 focus:ring-zinc-950/70',
        'empty:before:content-[attr(data-placeholder)] empty:before:text-zinc-400 empty:before:italic',
        'min-w-[1.5ch] min-h-[1.2em]',
        className
      )}
    />
  );
};
