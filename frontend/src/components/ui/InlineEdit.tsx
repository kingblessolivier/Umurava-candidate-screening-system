"use client";
import { useState, useRef, useEffect } from "react";
import { Check, X } from "lucide-react";

interface InlineEditProps {
  value: string;
  onSave: (newValue: string) => void;
  onCancel?: () => void;
  placeholder?: string;
  multiline?: boolean;
  validation?: (value: string) => boolean;
}

export function InlineEdit({
  value: initialValue,
  onSave,
  onCancel,
  placeholder = "Enter value...",
  multiline = false,
  validation,
}: InlineEditProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      if (inputRef.current instanceof HTMLInputElement) {
        inputRef.current.select();
      }
    }
  }, [isEditing]);

  const handleSave = () => {
    if (validation && !validation(value)) {
      setError("Invalid value");
      return;
    }

    if (value.trim() === initialValue.trim()) {
      setIsEditing(false);
      return;
    }

    onSave(value);
    setIsEditing(false);
    setError(null);
  };

  const handleCancel = () => {
    setValue(initialValue);
    setIsEditing(false);
    setError(null);
    onCancel?.();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !multiline) {
      handleSave();
    } else if (e.key === "Escape") {
      handleCancel();
    }
  };

  if (!isEditing) {
    return (
      <div
        onClick={() => setIsEditing(true)}
        className="px-3 py-2 rounded-lg cursor-pointer transition-all group"
        style={{
          backgroundColor: "rgba(255, 255, 255, 0.04)",
          border: "1px solid transparent",
        }}
        onMouseEnter={e => {
          e.currentTarget.style.backgroundColor = "rgba(59, 130, 246, 0.1)";
          e.currentTarget.style.borderColor = "#3b82f6";
        }}
        onMouseLeave={e => {
          e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.04)";
          e.currentTarget.style.borderColor = "transparent";
        }}
      >
        <div className="flex items-center justify-between">
          <span className="text-sm text-white">{initialValue || placeholder}</span>
          <span
            className="text-xs text-gray-400 group-hover:text-blue-400 transition-colors"
            style={{ marginLeft: "8px" }}
          >
            ✏️
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {multiline ? (
        <textarea
          ref={inputRef as React.Ref<HTMLTextAreaElement>}
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleSave}
          placeholder={placeholder}
          className="w-full px-3 py-2 rounded-lg text-sm text-white placeholder:text-gray-600 outline-none resize-none"
          style={{
            backgroundColor: "rgba(255, 255, 255, 0.08)",
            border: error ? "2px solid #ef4444" : "2px solid #3b82f6",
          }}
          rows={3}
        />
      ) : (
        <input
          ref={inputRef as React.Ref<HTMLInputElement>}
          type="text"
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleSave}
          placeholder={placeholder}
          className="w-full px-3 py-2 rounded-lg text-sm text-white placeholder:text-gray-600 outline-none"
          style={{
            backgroundColor: "rgba(255, 255, 255, 0.08)",
            border: error ? "2px solid #ef4444" : "2px solid #3b82f6",
          }}
        />
      )}

      {error && <p className="text-xs text-red-400">{error}</p>}

      {/* Action buttons */}
      <div className="flex items-center gap-2">
        <button
          onClick={handleSave}
          className="flex-1 flex items-center justify-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors"
          style={{
            backgroundColor: "rgba(34, 197, 94, 0.2)",
            color: "#22c55e",
          }}
        >
          <Check className="w-3 h-3" />
          Save
        </button>
        <button
          onClick={handleCancel}
          className="flex-1 flex items-center justify-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors"
          style={{
            backgroundColor: "rgba(239, 68, 68, 0.2)",
            color: "#ef4444",
          }}
        >
          <X className="w-3 h-3" />
          Cancel
        </button>
      </div>
    </div>
  );
}

interface EditableFieldProps {
  label?: string;
  value: string;
  onSave: (newValue: string) => void;
  type?: "text" | "email" | "number";
}

export function EditableField({
  label,
  value,
  onSave,
  type = "text",
}: EditableFieldProps) {
  let validation: ((v: string) => boolean) | undefined;

  if (type === "email") {
    validation = v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  } else if (type === "number") {
    validation = v => !isNaN(Number(v));
  }

  return (
    <div>
      {label && (
        <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-muted)" }}>
          {label}
        </label>
      )}
      <InlineEdit value={value} onSave={onSave} validation={validation} />
    </div>
  );
}
