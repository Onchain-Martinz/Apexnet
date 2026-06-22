// Client-side Sentry initialization — loaded by Next.js before the app
// hydrates. This is the recommended location for Next.js 15+ and Turbopack.
// The sentry.client.config.ts file at the project root remains for webpack
// compatibility; both files run the same Sentry.init() call.

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,

  // Capture 100% of errors; keep traces light to limit costs.
  tracesSampleRate: 0.1,

  // Only active when DSN is configured — keeps local dev silent.
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,

  debug: false,
});

// Instruments client-side navigation spans so Sentry can trace page transitions.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
