"use client";
import { motion } from "framer-motion";

export function SkeletonCard() {
  return (
    <motion.div
      animate={{ opacity: [0.5, 1, 0.5] }}
      transition={{ duration: 2, repeat: Infinity }}
      className="p-4 rounded-lg"
      style={{ backgroundColor: "rgba(148, 163, 184, 0.1)" }}
    >
      <div className="space-y-3">
        <div className="h-4 rounded-lg" style={{ backgroundColor: "rgba(148, 163, 184, 0.2)" }} />
        <div className="h-3 rounded-lg w-3/4" style={{ backgroundColor: "rgba(148, 163, 184, 0.2)" }} />
        <div className="h-3 rounded-lg w-1/2" style={{ backgroundColor: "rgba(148, 163, 184, 0.2)" }} />
      </div>
    </motion.div>
  );
}

export function SkeletonList({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

interface ProgressBarProps {
  value: number; // 0-100
  label?: string;
  animated?: boolean;
}

export function ProgressBar({ value, label, animated = true }: ProgressBarProps) {
  return (
    <div className="space-y-1.5">
      {label && <p className="text-xs font-medium text-white">{label}</p>}
      <div
        className="h-2 rounded-full overflow-hidden"
        style={{ backgroundColor: "rgba(148, 163, 184, 0.2)" }}
      >
        {animated ? (
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${value}%` }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="h-full bg-gradient-to-r"
            style={{
              backgroundImage:
                value < 60
                  ? "linear-gradient(90deg, #f59e0b, #f97316)"
                  : value < 80
                    ? "linear-gradient(90deg, #3b82f6, #0ea5e9)"
                    : "linear-gradient(90deg, #22c55e, #10b981)",
            }}
          />
        ) : (
          <div
            className="h-full transition-all"
            style={{
              width: `${value}%`,
              backgroundColor:
                value < 60
                  ? "#f59e0b"
                  : value < 80
                    ? "#3b82f6"
                    : "#22c55e",
            }}
          />
        )}
      </div>
      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
        {value}% complete
      </p>
    </div>
  );
}

interface StepperProps {
  steps: string[];
  currentStep: number;
  onStepClick?: (step: number) => void;
}

export function Stepper({ steps, currentStep, onStepClick }: StepperProps) {
  return (
    <div className="flex items-center justify-between">
      {steps.map((step, i) => {
        const isActive = i <= currentStep;
        const isCurrent = i === currentStep;

        return (
          <div key={i} className="flex items-center flex-1">
            {/* Step circle */}
            <button
              onClick={() => onStepClick?.(i)}
              className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all"
              style={{
                backgroundColor: isActive
                  ? isCurrent
                    ? "#3b82f6"
                    : "rgba(34, 197, 94, 0.2)"
                  : "rgba(148, 163, 184, 0.1)",
                color: isActive ? "#3b82f6" : "var(--text-muted)",
                borderWidth: isCurrent ? 2 : 1,
                borderColor: isCurrent ? "#3b82f6" : "transparent",
              }}
              title={step}
            >
              {isCurrent ? "●" : i + 1}
            </button>

            {/* Connecting line */}
            {i < steps.length - 1 && (
              <div
                className="flex-1 h-1 mx-2 rounded-full"
                style={{
                  backgroundColor: isActive
                    ? "#3b82f6"
                    : "rgba(148, 163, 184, 0.1)",
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
