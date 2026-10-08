import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Vercel expects the framework-default `.next` output. Keep local build
  // artifacts separate so they do not collide with deployment output.
  distDir: process.env.NEXT_DIST_DIR ?? (process.env.VERCEL === "1" ? ".next" : ".next-local"),
  outputFileTracingRoot: process.cwd(),
  async redirects() {
    return [
      { source: "/pokopia/funnel/start", destination: "/pokopia/start", permanent: true },
      { source: "/pokopia/funnel/daily-reset", destination: "/pokopia/daily-reset", permanent: true },
      { source: "/pokopia/funnel/companion", destination: "/pokopia/companion", permanent: true },
      { source: "/pokopia/funnel/complete-player-system", destination: "/pokopia/complete-player-system", permanent: true },
      { source: "/pokopia/funnel/completionist-kit", destination: "/pokopia/completionist-kit", permanent: true },
      { source: "/pokopia/funnel/checkout", destination: "/pokopia/checkout", permanent: true },
      { source: "/pokopia/funnel/complete", destination: "/pokopia/complete", permanent: true },
      { source: "/pokopia/funnel/sign-in", destination: "/pokopia/sign-in", permanent: true },
      { source: "/pokopia/funnel/mini-tool", destination: "/pokopia/companion", permanent: true },
    ];
  },
};

export default nextConfig;
