import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // Prevent Next.js from bundling the AWS SDK — it must run as native Node.js
  // modules. Without this, @aws-sdk/client-s3 fails at runtime in serverless
  // environments because it depends on Node.js built-ins (crypto, stream, etc.)
  // that the edge/webpack bundler cannot polyfill correctly.
  serverExternalPackages: ["@aws-sdk/client-s3"],

  images: {
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
};

export default withSentryConfig(nextConfig, {
  // ── Sentry build-time config ────────────────────────────────────────────
  // Source map upload requires SENTRY_ORG, SENTRY_PROJECT, and SENTRY_AUTH_TOKEN.
  // Leave these unset in local dev — Sentry will skip upload and warn silently.
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // Suppress noisy Sentry webpack output
  silent: true,

  // Upload more artifacts for accurate client-side stack traces
  widenClientFileUpload: true,

  // Delete .map files from the build output after uploading to Sentry so they
  // are never served to end users. Sentry still has them for symbolication.
  sourcemaps: {
    filesToDeleteAfterUpload: [".next/static/**/*.map"],
  },

  // Opt out of Sentry's own build telemetry
  telemetry: false,

  webpack: {
    // Annotate React component names in error reports for easier triage.
    reactComponentAnnotation: { enabled: true },
    // Tree-shake the Sentry debug logger out of production bundles.
    treeshake: { removeDebugLogging: true },
  },
});
