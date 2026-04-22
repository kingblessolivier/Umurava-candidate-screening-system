import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  distDir: ".next-cache",
  // standalone output (and its trace file) only runs during `next build`, not `next dev`
  // This prevents the EPERM: trace file lock error on Windows in development
  ...(isProd ? { output: "standalone" } : {}),
};

export default nextConfig;
