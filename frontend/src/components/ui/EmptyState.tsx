"use client";
import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Lightbulb } from "lucide-react";

interface EmptyStateProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  tips?: string[];
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  tips,
}: EmptyStateProps) {
  const Icon = icon;
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-16 px-4"
    >
      {/* Icon */}
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6"
        style={{ backgroundColor: "rgba(59, 130, 246, 0.1)" }}
      >
        <Icon className="w-8 h-8 text-blue-400" />
      </div>

      {/* Title and Description */}
      <h3 className="text-xl font-bold text-white text-center mb-2">{title}</h3>
      <p className="text-sm text-center mb-8 max-w-sm" style={{ color: "var(--text-muted)" }}>
        {description}
      </p>

      {/* Action Button */}
      {action && (
        <>
          {action.href ? (
            <Link
              href={action.href}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-white transition-all mb-8"
              style={{
                background: "linear-gradient(135deg, #3b82f6, #7c3aed)",
                boxShadow: "0 4px 12px rgba(59, 130, 246, 0.3)",
              }}
            >
              {action.label}
              <ArrowRight className="w-4 h-4" />
            </Link>
          ) : (
            <button
              onClick={action.onClick}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-white transition-all mb-8"
              style={{
                background: "linear-gradient(135deg, #3b82f6, #7c3aed)",
                boxShadow: "0 4px 12px rgba(59, 130, 246, 0.3)",
              }}
            >
              {action.label}
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </>
      )}

      {/* Tips */}
      {tips && tips.length > 0 && (
        <div className="w-full max-w-sm">
          <div className="flex items-center gap-2 mb-3 text-white font-medium">
            <Lightbulb className="w-4 h-4 text-amber-400" />
            <span className="text-sm">Pro Tips</span>
          </div>
          <ul className="space-y-2">
            {tips.map((tip, i) => (
              <li
                key={i}
                className="text-xs p-2 rounded-lg"
                style={{
                  backgroundColor: "rgba(251, 146, 60, 0.1)",
                  color: "var(--text-muted)",
                  borderLeft: "2px solid #fb923c",
                }}
              >
                • {tip}
              </li>
            ))}
          </ul>
        </div>
      )}
    </motion.div>
  );
}
