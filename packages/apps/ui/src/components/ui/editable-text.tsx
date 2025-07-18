'use client';

import { useState, useRef, useEffect } from 'react';
import { Edit2, Trash2 } from 'lucide-react';
import { Button } from './button';

interface EditableTextProps {
  value: string;
  onSave: (newValue: string) => void;
  onDelete?: () => void;
  className?: string;
  placeholder?: string;
}

export function EditableText({
  value,
  onSave,
  onDelete,
  className = '',
  placeholder,
}: EditableTextProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  const spanRef = useRef<HTMLSpanElement>(null);
  const [spanStyles, setSpanStyles] = useState<{
    font: string;
    fontSize: string;
    fontWeight: string;
    fontFamily: string;
    lineHeight: string;
    letterSpacing: string;
  } | null>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const startEditing = () => {
    if (spanRef.current) {
      const computedStyles = window.getComputedStyle(spanRef.current);
      setSpanStyles({
        font: computedStyles.font,
        fontSize: computedStyles.fontSize,
        fontWeight: computedStyles.fontWeight,
        fontFamily: computedStyles.fontFamily,
        lineHeight: computedStyles.lineHeight,
        letterSpacing: computedStyles.letterSpacing,
      });
    }
    setIsEditing(true);
  };

  const handleSave = () => {
    if (editValue.trim() !== value) {
      onSave(editValue.trim());
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(value);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleSave}
        className={className}
        placeholder={placeholder}
        style={{
          background: 'transparent',
          border: 'none',
          outline: 'none',
          borderBottom: '1px solid hsl(var(--border))',
          padding: 0,
          margin: 0,
          fontSize: spanStyles?.fontSize || 'inherit',
          fontWeight: spanStyles?.fontWeight || 'inherit',
          fontFamily: spanStyles?.fontFamily || 'inherit',
          lineHeight: spanStyles?.lineHeight || 'inherit',
          letterSpacing: spanStyles?.letterSpacing || 'inherit',
          color: 'inherit',
          textAlign: 'inherit',
          width: '100%',
          minWidth: 0,
        }}
      />
    );
  }

  return (
    <div className="group flex items-center gap-2">
      <span ref={spanRef} className={className}>
        {value}
      </span>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          size="sm"
          variant="ghost"
          className="h-auto p-1"
          onClick={startEditing}
        >
          <Edit2 className="h-4 w-4" />
        </Button>
        {onDelete && (
          <Button
            size="sm"
            variant="ghost"
            className="h-auto p-1 text-muted-foreground hover:text-destructive"
            onClick={onDelete}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
