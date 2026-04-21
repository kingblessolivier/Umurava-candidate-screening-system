"use client";
import { useEffect, useState } from "react";
import { AlertCircle, Trash2, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";

interface DraftRecoveryProps {
  draftKey: string;
  onRestore: (data: Record<string, any>) => void;
  onDiscard: () => void;
  isOpen: boolean;
}

export function DraftRecoveryModal({
  draftKey,
  onRestore,
  onDiscard,
  isOpen,
}: DraftRecoveryProps) {
  const [draft, setDraft] = useState<any>(null);

  useEffect(() => {
    if (isOpen) {
      const stored = localStorage.getItem(`draft_${draftKey}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        setDraft(parsed);
      }
    }
  }, [isOpen, draftKey]);

  if (!isOpen || !draft) return null;

  const { data, timestamp } = draft;
  const timeAgo = formatTimeAgo(new Date(timestamp));

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-black border border-gray-700 rounded-xl p-6 max-w-md w-full mx-4"
      >
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-white font-semibold mb-1">Draft Found</h3>
            <p className="text-sm text-gray-400 mb-4">
              You have an unsaved draft from <span className="font-medium">{timeAgo}</span>
            </p>

            {/* Draft preview */}
            <div
              className="rounded-lg p-3 mb-4 text-sm space-y-1"
              style={{ backgroundColor: "rgba(59, 130, 246, 0.1)" }}
            >
              {data.title && <p className="text-white">📋 <strong>{data.title}</strong></p>}
              {data.requirements?.length > 0 && (
                <p className="text-gray-400">📊 {data.requirements.length} requirements</p>
              )}
              {data.skills?.length > 0 && (
                <p className="text-gray-400">🛠️ {data.skills.length} skills</p>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  onDiscard();
                  localStorage.removeItem(`draft_${draftKey}`);
                  setDraft(null);
                }}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                style={{
                  backgroundColor: "rgba(239, 68, 68, 0.1)",
                  color: "#ef4444",
                  border: "1px solid rgba(239, 68, 68, 0.2)",
                }}
              >
                <Trash2 className="w-4 h-4" />
                Discard
              </button>
              <button
                onClick={() => {
                  onRestore(data);
                  setDraft(null);
                }}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-white transition-colors"
                style={{ backgroundColor: "#3b82f6" }}
              >
                Restore
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}
