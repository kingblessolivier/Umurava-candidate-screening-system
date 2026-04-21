"use client";

export type ScreeningStatus = 
  | "pending" 
  | "screening" 
  | "screened" 
  | "rejected" 
  | "interview_scheduled" 
  | "interviewed" 
  | "offer_sent" 
  | "accepted"
  | "declined";

interface StatusBadgeProps {
  status: ScreeningStatus;
  showIcon?: boolean;
}

const STATUS_CONFIG: Record<ScreeningStatus, { label: string; color: string; bgColor: string; icon: string }> = {
  pending: {
    label: "Pending",
    color: "#9ca3af",
    bgColor: "rgba(156, 163, 175, 0.1)",
    icon: "⏳",
  },
  screening: {
    label: "Screening...",
    color: "#3b82f6",
    bgColor: "rgba(59, 130, 246, 0.1)",
    icon: "🔍",
  },
  screened: {
    label: "Screening Complete",
    color: "#22c55e",
    bgColor: "rgba(34, 197, 94, 0.1)",
    icon: "✅",
  },
  rejected: {
    label: "Rejected",
    color: "#ef4444",
    bgColor: "rgba(239, 68, 68, 0.1)",
    icon: "❌",
  },
  interview_scheduled: {
    label: "Interview Scheduled",
    color: "#f59e0b",
    bgColor: "rgba(245, 158, 11, 0.1)",
    icon: "📅",
  },
  interviewed: {
    label: "Interviewed",
    color: "#8b5cf6",
    bgColor: "rgba(139, 92, 246, 0.1)",
    icon: "💬",
  },
  offer_sent: {
    label: "Offer Sent",
    color: "#06b6d4",
    bgColor: "rgba(6, 182, 212, 0.1)",
    icon: "💼",
  },
  accepted: {
    label: "Accepted",
    color: "#10b981",
    bgColor: "rgba(16, 185, 129, 0.1)",
    icon: "🎉",
  },
  declined: {
    label: "Declined",
    color: "#dc2626",
    bgColor: "rgba(220, 38, 38, 0.1)",
    icon: "👋",
  },
};

export function StatusBadge({ status, showIcon = true }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status];

  return (
    <span
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all"
      style={{
        color: config.color,
        backgroundColor: config.bgColor,
        border: `1px solid ${config.color}20`,
      }}
    >
      {showIcon && <span className="text-sm">{config.icon}</span>}
      {config.label}
    </span>
  );
}

export function StatusDot({ status }: { status: ScreeningStatus }) {
  const config = STATUS_CONFIG[status];
  
  return (
    <div
      className="w-2 h-2 rounded-full"
      style={{ backgroundColor: config.color }}
      title={config.label}
    />
  );
}
