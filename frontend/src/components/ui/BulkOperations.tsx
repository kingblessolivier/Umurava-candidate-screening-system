"use client";
import { useState } from "react";
import { ChevronDown, Trash2, Download, Mail, Plus } from "lucide-react";

interface BulkOperationsProps {
  selectedCount: number;
  onDelete?: () => void;
  onExport?: () => void;
  onSendEmail?: () => void;
  onAddToJob?: () => void;
  disabled?: boolean;
}

export function BulkOperationsBar({
  selectedCount,
  onDelete,
  onExport,
  onSendEmail,
  onAddToJob,
  disabled = false,
}: BulkOperationsProps) {
  const [showMenu, setShowMenu] = useState(false);

  if (selectedCount === 0) return null;

  return (
    <div
      className="sticky bottom-0 left-0 right-0 p-4 shadow-lg border-t"
      style={{
        backgroundColor: "var(--bg-surface)",
        borderColor: "var(--border)",
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold text-white"
            style={{ backgroundColor: "#3b82f6" }}
          >
            {selectedCount}
          </div>
          <span className="text-sm font-medium text-white">
            {selectedCount} selected
          </span>
        </div>

        <div className="flex items-center gap-2 relative">
          {/* Individual action buttons */}
          {onExport && (
            <button
              onClick={onExport}
              disabled={disabled}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all"
              style={{
                backgroundColor: "rgba(34, 197, 94, 0.1)",
                color: "#22c55e",
                opacity: disabled ? 0.5 : 1,
              }}
              title="Export selected as CSV"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
          )}

          {onSendEmail && (
            <button
              onClick={onSendEmail}
              disabled={disabled}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all"
              style={{
                backgroundColor: "rgba(59, 130, 246, 0.1)",
                color: "#3b82f6",
                opacity: disabled ? 0.5 : 1,
              }}
              title="Send email to selected"
            >
              <Mail className="w-4 h-4" />
              Email
            </button>
          )}

          {/* More actions dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              disabled={disabled}
              className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-all"
              style={{
                backgroundColor: "rgba(148, 163, 184, 0.1)",
                color: "var(--text-muted)",
                opacity: disabled ? 0.5 : 1,
              }}
            >
              More
              <ChevronDown className="w-4 h-4" />
            </button>

            {showMenu && (
              <div
                className="absolute right-0 mt-2 w-48 rounded-lg shadow-lg z-50"
                style={{
                  backgroundColor: "var(--bg-surface)",
                  border: "1px solid var(--border)",
                }}
              >
                {onAddToJob && (
                  <button
                    onClick={() => {
                      onAddToJob();
                      setShowMenu(false);
                    }}
                    className="flex items-center gap-2 w-full px-4 py-2 text-sm text-left hover:opacity-75 transition-opacity border-b"
                    style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}
                  >
                    <Plus className="w-4 h-4" />
                    Add to Job
                  </button>
                )}

                {onDelete && (
                  <button
                    onClick={() => {
                      onDelete();
                      setShowMenu(false);
                    }}
                    className="flex items-center gap-2 w-full px-4 py-2 text-sm text-left hover:opacity-75 transition-opacity text-red-400"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface CandidateCheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export function CandidateCheckbox({ checked, onChange }: CandidateCheckboxProps) {
  return (
    <input
      type="checkbox"
      checked={checked}
      onChange={e => onChange(e.target.checked)}
      className="w-4 h-4 rounded accent-blue-500 cursor-pointer"
    />
  );
}
