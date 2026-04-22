"use client";
import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  size?: "sm" | "md" | "lg" | "xl" | "2xl" | "full";
  children: React.ReactNode;
  showCloseButton?: boolean;
  headerAccent?: "blue" | "violet" | "emerald" | "amber" | "rose";
  className?: string;
  panelClassName?: string;
}

const sizeStyles = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  "2xl": "max-w-2xl",
  full: "max-w-[95vw]",
};

const accentGradients = {
  blue: "from-blue-600/5 via-white to-indigo-600/5",
  violet: "from-violet-600/5 via-white to-purple-600/5",
  emerald: "from-emerald-600/5 via-white to-teal-600/5",
  amber: "from-amber-600/5 via-white to-orange-600/5",
  rose: "from-rose-600/5 via-white to-red-600/5",
};

const accentIcons = {
  blue: "bg-gradient-to-br from-blue-500 to-indigo-600 text-white border-0 shadow-lg shadow-blue-500/25",
  violet: "bg-gradient-to-br from-violet-500 to-purple-600 text-white border-0 shadow-lg shadow-violet-500/25",
  emerald: "bg-gradient-to-br from-emerald-500 to-teal-600 text-white border-0 shadow-lg shadow-emerald-500/25",
  amber: "bg-gradient-to-br from-amber-500 to-orange-600 text-white border-0 shadow-lg shadow-amber-500/25",
  rose: "bg-gradient-to-br from-rose-500 to-red-600 text-white border-0 shadow-lg shadow-rose-500/25",
};

export function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  size = "md",
  children,
  showCloseButton = true,
  headerAccent = "blue",
  className,
  panelClassName,
}: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.addEventListener("keydown", handleEsc);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={overlayRef}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4"
          onClick={(e) => {
            if (e.target === overlayRef.current) onClose();
          }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 backdrop-blur-md bg-black/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Gradient Orbs for depth */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <motion.div
              className={cn(
                "absolute -top-32 -left-32 w-96 h-96 rounded-full blur-3xl opacity-40",
                headerAccent === "blue" && "bg-blue-500",
                headerAccent === "violet" && "bg-violet-500",
                headerAccent === "emerald" && "bg-emerald-500",
                headerAccent === "amber" && "bg-amber-500",
                headerAccent === "rose" && "bg-rose-500"
              )}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 0.4, scale: 1 }}
              transition={{ duration: 0.5 }}
            />
            <motion.div
              className={cn(
                "absolute -bottom-32 -right-32 w-96 h-96 rounded-full blur-3xl opacity-30",
                headerAccent === "violet" && "bg-violet-500",
                headerAccent === "blue" && "bg-indigo-500",
                headerAccent === "emerald" && "bg-teal-500",
                headerAccent === "amber" && "bg-orange-500",
                headerAccent === "rose" && "bg-red-500"
              )}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 0.3, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            />
          </div>

          {/* Modal Panel */}
          <motion.div
            initial={{ scale: 0.94, opacity: 0, y: 16 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0, y: 10 }}
            transition={{ type: "spring", damping: 26, stiffness: 300 }}
            className={cn(
              "relative w-full rounded-2xl overflow-hidden flex flex-col shadow-2xl",
              "border border-gray-200/80 bg-white",
              sizeStyles[size],
              panelClassName
            )}
          >
            {/* Header Accent Bar - More prominent */}
            <div
              className={cn(
                "h-1.5 w-full bg-gradient-to-r",
                headerAccent === "blue" && "from-blue-600 via-blue-500 to-indigo-600",
                headerAccent === "violet" && "from-violet-600 via-violet-500 to-purple-600",
                headerAccent === "emerald" && "from-emerald-600 via-emerald-500 to-teal-600",
                headerAccent === "amber" && "from-amber-600 via-amber-500 to-orange-600",
                headerAccent === "rose" && "from-rose-600 via-rose-500 to-red-600"
              )}
            />

            {/* Header */}
            {(title || showCloseButton) && (
              <div
                className={cn(
                  "px-6 py-4 flex items-center justify-between bg-gradient-to-r border-b border-gray-100/60",
                  accentGradients[headerAccent]
                )}
              >
                <div className="flex items-center gap-3">
                  {title && (
                    <div
                      className={cn(
                        "w-11 h-11 rounded-xl flex items-center justify-center text-sm font-bold",
                        accentIcons[headerAccent]
                      )}
                    >
                      {title.split(" ").map((w) => w[0]).join("").slice(0, 2)}
                    </div>
                  )}
                  <div>
                    {title && (
                      <h2 className="text-base font-bold text-gray-900">{title}</h2>
                    )}
                    {subtitle && (
                      <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>
                    )}
                  </div>
                </div>
                {showCloseButton && (
                  <button
                    onClick={onClose}
                    className="p-2 rounded-xl hover:bg-gray-100/80 transition-all text-gray-400 hover:text-gray-600 hover:rotate-90 duration-200"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
            )}

            {/* Content */}
            <div className={cn("flex-1 overflow-y-auto", className)}>{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Confirmation Modal variant
interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning" | "info";
  isLoading?: boolean;
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "info",
  isLoading = false,
}: ConfirmModalProps) {
  const variantStyles = {
    danger: {
      icon: "bg-red-100 text-red-600 border-red-200",
      button: "bg-red-600 hover:bg-red-700 text-white",
      gradient: "from-red-50 via-white to-red-50",
      accent: "from-red-600 to-rose-600",
    },
    warning: {
      icon: "bg-amber-100 text-amber-600 border-amber-200",
      button: "bg-amber-600 hover:bg-amber-700 text-white",
      gradient: "from-amber-50 via-white to-amber-50",
      accent: "from-amber-600 to-orange-600",
    },
    info: {
      icon: "bg-blue-100 text-blue-600 border-blue-200",
      button: "bg-blue-600 hover:bg-blue-700 text-white",
      gradient: "from-blue-50 via-white to-blue-50",
      accent: "from-blue-600 to-indigo-600",
    },
  };

  const style = variantStyles[variant];

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm" showCloseButton={false} headerAccent={variant === "danger" ? "rose" : variant === "warning" ? "amber" : "blue"}>
      {/* Accent bar */}
      <div className={cn("h-1.5 w-full bg-gradient-to-r", style.accent)} />
      <div className={cn("p-6 bg-gradient-to-b", style.gradient)}>
        <div className="flex flex-col items-center text-center -mt-2">
          <div
            className={cn(
              "w-16 h-16 rounded-2xl flex items-center justify-center border-2 border mb-4 mt-2",
              style.icon
            )}
          >
            <svg
              className="w-7 h-7"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h3 className="text-sm font-bold text-gray-900 mb-1.5">{title}</h3>
          <p className="text-xs text-gray-500 mb-5 leading-relaxed">{message}</p>
          <div className="flex gap-3 w-full">
            <button
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 py-2.5 text-xs font-semibold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all disabled:opacity-50"
            >
              {cancelLabel}
            </button>
            <button
              onClick={onConfirm}
              disabled={isLoading}
              className={cn(
                "flex-1 py-2.5 text-xs font-semibold rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2",
                style.button
              )}
            >
              {isLoading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Loading...
                </>
              ) : (
                confirmLabel
              )}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

// Slide-over Panel variant (from the side)
interface SlidePanelProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  width?: "sm" | "md" | "lg";
  accentColor?: "blue" | "violet" | "emerald" | "amber" | "rose";
}

export function SlidePanel({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  width = "md",
  accentColor = "blue",
}: SlidePanelProps) {
  const widths = { sm: "max-w-sm", md: "max-w-md", lg: "max-w-lg" };

  useEffect(() => {
    if (isOpen) document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  const accentGradients = {
    blue: "from-blue-600/5 via-white to-indigo-600/5",
    violet: "from-violet-600/5 via-white to-purple-600/5",
    emerald: "from-emerald-600/5 via-white to-teal-600/5",
    amber: "from-amber-600/5 via-white to-orange-600/5",
    rose: "from-rose-600/5 via-white to-red-600/5",
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex justify-end"
        >
          <motion.div
            className="absolute inset-0 backdrop-blur-md bg-black/40"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className={cn(
              "relative h-full w-full bg-white shadow-2xl flex flex-col",
              "border-l border-gray-200",
              widths[width]
            )}
          >
            {/* Accent bar */}
            <div
              className={cn(
                "h-1 w-full bg-gradient-to-r",
                accentColor === "blue" && "from-blue-600 to-indigo-600",
                accentColor === "violet" && "from-violet-600 to-purple-600",
                accentColor === "emerald" && "from-emerald-600 to-teal-600",
                accentColor === "amber" && "from-amber-600 to-orange-600",
                accentColor === "rose" && "from-rose-600 to-red-600"
              )}
            />
            {title && (
              <div className={cn("px-5 py-4 border-b border-gray-100 bg-gradient-to-r flex items-center justify-between", accentGradients[accentColor])}>
                <div>
                  <h2 className="text-sm font-bold text-gray-900">{title}</h2>
                  {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            )}
            <div className="flex-1 overflow-y-auto">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
