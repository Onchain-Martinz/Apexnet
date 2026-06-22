import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,

  // Capture 100% of errors; reduce traces to limit performance monitoring costs.
  tracesSampleRate: 0.1,

  // Only active when DSN is configured — keeps local dev silent.
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Show debug output in the browser console (remove before going live).
  debug: false,
});
