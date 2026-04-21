"use client";
import { useState } from "react";
import { Bold, Italic, List, Quote } from "lucide-react";
import { motion } from "framer-motion";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: number;
  disabled?: boolean;
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = "Enter text...",
  minHeight = 150,
  disabled = false,
}: RichTextEditorProps) {
  const [isFocused, setIsFocused] = useState(false);

  const insertMarkdown = (before: string, after: string = "") => {
    const textarea = document.querySelector(
      "[data-rich-textarea]"
    ) as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);
    const newValue =
      value.substring(0, start) +
      before +
      selectedText +
      after +
      value.substring(end);

    onChange(newValue);

    // Reset cursor position
    setTimeout(() => {
      textarea.selectionStart = start + before.length;
      textarea.selectionEnd = textarea.selectionStart + selectedText.length;
      textarea.focus();
    }, 0);
  };

  const formatTools = [
    {
      icon: Bold,
      label: "Bold",
      onClick: () => insertMarkdown("**", "**"),
    },
    {
      icon: Italic,
      label: "Italic",
      onClick: () => insertMarkdown("*", "*"),
    },
    {
      icon: List,
      label: "List",
      onClick: () =>
        insertMarkdown("\n• ", ""),
    },
    {
      icon: Quote,
      label: "Quote",
      onClick: () =>
        insertMarkdown("\n> ", ""),
    },
  ];

  return (
    <motion.div
      className="rounded-xl overflow-hidden"
      style={{
        border: isFocused ? "2px solid #3b82f6" : "1px solid var(--border)",
        backgroundColor: "rgba(255, 255, 255, 0.04)",
      }}
    >
      {/* Toolbar */}
      <div
        className="flex items-center gap-1 p-2 border-b"
        style={{ borderColor: "var(--border)" }}
      >
        {formatTools.map(tool => {
          const Icon = tool.icon;
          return (
            <button
              key={tool.label}
              type="button"
              onClick={tool.onClick}
              disabled={disabled}
              title={tool.label}
              className="p-2 rounded-lg transition-all hover:opacity-75 disabled:opacity-50"
              style={{ backgroundColor: "rgba(255, 255, 255, 0.04)" }}
            >
              <Icon className="w-4 h-4 text-gray-400" />
            </button>
          );
        })}
      </div>

      {/* Editor */}
      <textarea
        data-rich-textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        disabled={disabled}
        placeholder={placeholder}
        className="w-full px-4 py-3 text-sm text-white placeholder:text-gray-600 outline-none resize-none disabled:opacity-50"
        style={{
          backgroundColor: "transparent",
          minHeight: `${minHeight}px`,
        }}
      />

      {/* Footer hint */}
      <div
        className="px-4 py-2 text-xs"
        style={{
          backgroundColor: "rgba(255, 255, 255, 0.02)",
          color: "var(--text-muted)",
          borderTop: "1px solid var(--border)",
        }}
      >
        💡 Use <code className="bg-gray-800 px-1 rounded">**bold**</code> and{" "}
        <code className="bg-gray-800 px-1 rounded">*italic*</code> for formatting
      </div>
    </motion.div>
  );
}
