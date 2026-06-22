import * as Sentry from "@sentry/nextjs";

// Edge-runtime initialization — middleware runs in the Edge runtime.

Sentry.init({
  dsn: process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,

  // Keep edge traces very light (middleware is on the hot path).
  tracesSampleRate: 0.05,

  enabled: !!(process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN),

  debug: false,
});
