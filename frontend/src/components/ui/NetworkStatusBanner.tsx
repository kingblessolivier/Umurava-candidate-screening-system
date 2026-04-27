"use client";
import { useEffect, useState } from "react";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";

export function NetworkStatusBanner() {
  const { isOnline, isSlowConnection } = useNetworkStatus();
  const [justCameBack, setJustCameBack] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOnline) {
      setJustCameBack(true);
      return;
    }
    if (justCameBack) {
      const timer = setTimeout(() => setJustCameBack(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isOnline]);

  if (!mounted || (isOnline && !justCameBack && !isSlowConnection)) return null;

  return (
    <div
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-full px-4 py-2 text-xs font-medium shadow-lg transition-all ${
        !isOnline
          ? "bg-red-600 text-white"
          : isSlowConnection
          ? "bg-yellow-500 text-gray-900"
          : "bg-green-600 text-white"
      }`}
    >
      {!isOnline ? (
        <>
          <span className="h-2 w-2 rounded-full bg-white opacity-80" />
          You are offline. Some features may not work.
        </>
      ) : isSlowConnection ? (
        <>
          <span className="h-2 w-2 rounded-full bg-gray-900 opacity-60" />
          Slow connection detected. Things may load slowly.
        </>
      ) : (
        <>
          <span className="h-2 w-2 rounded-full bg-white opacity-80" />
          You are back online!
        </>
      )}
    </div>
  );
}
