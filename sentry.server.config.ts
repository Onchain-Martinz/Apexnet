import * as Sentry from "@sentry/nextjs";

// Server-side and route-handler initialization.
// SENTRY_DSN is preferred over NEXT_PUBLIC_SENTRY_DSN for server config because
// it is never embedded in client bundles.

Sentry.init({
  dsn: process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,

  tracesSampleRate: 0.1,

  enabled: !!(process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN),

  debug: false,
});
