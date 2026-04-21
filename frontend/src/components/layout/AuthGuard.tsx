"use client";
import { useEffect } from "react";
import { useSelector } from "react-redux";
import { useRouter, usePathname } from "next/navigation";
import { RootState } from "@/store";

const PUBLIC_PATHS = ["/login", "/signup"];

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();
  const token    = useSelector((s: RootState) => s.auth.token);

  useEffect(() => {
    const isPublic = PUBLIC_PATHS.includes(pathname);
    if (!token && !isPublic) router.replace("/login");
    if (token && isPublic)  router.replace("/");
  }, [token, pathname, router]);

  return <>{children}</>;
}
