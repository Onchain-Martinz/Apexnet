"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

// Root-level React error boundary. Next.js renders this when an uncaught error
// escapes the root layout. It replaces the entire <html> tree, so it cannot
// rely on the root layout's CSS imports. Tailwind classes are still available
// because they are injected via the global stylesheet from the Next.js build.

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col items-center justify-center bg-gray-950 px-5 text-center">
        <p className="text-[13px] font-semibold uppercase tracking-widest text-gray-500">
          Something went wrong
        </p>
        <h1 className="mt-2 text-[22px] font-bold text-white">
          An unexpected error occurred
        </h1>
        <p className="mt-2 max-w-sm text-[14px] leading-relaxed text-gray-400">
          Our team has been notified. You can try refreshing the page or come
          back shortly.
        </p>
        {error.digest && (
          <p className="mt-3 font-mono text-[11px] text-gray-600">
            Error ID: {error.digest}
          </p>
        )}
        <button
          onClick={reset}
          className="mt-6 rounded-lg bg-white px-5 py-2.5 text-[14px] font-semibold text-gray-900 transition hover:bg-gray-100"
        >
          Try again
        </button>
      </body>
    </html>
  );
}
