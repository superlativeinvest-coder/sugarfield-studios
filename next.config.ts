import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Vercel expects the framework-default `.next` output. Keep local build
  // artifacts separate so they do not collide with deployment output.
  distDir: process.env.NEXT_DIST_DIR ?? (process.env.VERCEL === "1" ? ".next" : ".next-local"),
  outputFileTracingRoot: process.cwd(),
};

export default nextConfig;
