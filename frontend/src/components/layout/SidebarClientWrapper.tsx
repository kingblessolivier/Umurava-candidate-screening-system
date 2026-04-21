"use client";
import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";

const NO_SIDEBAR = ["/login", "/signup"];

export function SidebarClientWrapper() {
  const pathname = usePathname();

  if (NO_SIDEBAR.some(p => pathname === p)) {
    // Remove sidebar margin for auth pages via inline style on <main>
    return (
      <style>{`main { margin-left: 0 !important; }`}</style>
    );
  }

  return <Sidebar />;
}
