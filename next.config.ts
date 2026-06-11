import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable React strict mode for catching issues early
  reactStrictMode: true,

  images: {
    // Add your R2 public bucket domain here when configured
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.r2.cloudflarestorage.com",
      },
      {
        protocol: "https",
        hostname: "pub-*.r2.dev",
      },
    ],
  },

  // Future: enable when using R2 signed URLs via middleware
  // experimental: { serverActions: { allowedOrigins: ["..."] } },
};

export default nextConfig;
