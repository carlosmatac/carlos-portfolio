import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep the regular Next.js deployment; Sites can also receive a static build.
  output: process.env.SITES_EXPORT === "1" ? "export" : undefined,
};

export default nextConfig;
