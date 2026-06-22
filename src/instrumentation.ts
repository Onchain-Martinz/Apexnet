// Next.js instrumentation hook — loaded once per server process.
// Registers Sentry for Node.js (route handlers, server components) and
// the Edge runtime (middleware). Client-side Sentry is loaded from
// src/instrumentation-client.ts via the Next.js instrumentation pipeline.

import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("../sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("../sentry.edge.config");
  }
}

// Captures errors from nested React Server Components and Route Handlers.
// Required by Sentry's Next.js SDK for full server-side error coverage.
export const onRequestError = Sentry.captureRequestError;
