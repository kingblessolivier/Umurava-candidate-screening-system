"use client";
import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";

interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: React.ReactNode;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

export function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav className="flex items-center gap-1 text-sm mb-6">
      {/* Home icon */}
      <Link
        href="/"
        className="p-1.5 rounded-lg transition-colors hover:opacity-75"
        style={{ backgroundColor: "rgba(59, 130, 246, 0.1)" }}
        title="Home"
      >
        <Home className="w-4 h-4 text-blue-400" />
      </Link>

      {items.map((item, index) => (
        <div key={index} className="flex items-center gap-1">
          <ChevronRight className="w-4 h-4" style={{ color: "var(--text-muted)" }} />

          {item.href ? (
            <Link
              href={item.href}
              className="px-2 py-1 rounded-lg transition-all hover:opacity-75"
              style={{
                color: "var(--text-muted)",
              }}
            >
              <span className="flex items-center gap-1">
                {item.icon && <span>{item.icon}</span>}
                {item.label}
              </span>
            </Link>
          ) : (
            <span
              className="px-2 py-1 rounded-lg text-white font-medium"
              style={{
                backgroundColor: "rgba(59, 130, 246, 0.1)",
              }}
            >
              <span className="flex items-center gap-1">
                {item.icon && <span>{item.icon}</span>}
                {item.label}
              </span>
            </span>
          )}
        </div>
      ))}
    </nav>
  );
}
