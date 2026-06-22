import * as Sentry from "@sentry/nextjs";

// ── Apex monitoring helpers ───────────────────────────────────────────────────
// Thin wrappers over Sentry that attach structured context to every event.
// Import from here instead of @sentry/nextjs directly so context shape stays
// consistent and can be evolved in one place.
//
// Security contract:
//   - userId is set as a Sentry "user" so it appears in the user panel.
//   - IDs (textbookId, purchaseId, etc.) are set as searchable tags.
//   - No PII beyond userId (no email, name, password, bank details) is included.
//   - Raw error messages from external services (Flutterwave, Resend) may appear
//     in the event title — they contain reference codes and amounts, not PII.

export interface CaptureContext {
  userId?: string;
  textbookId?: string;
  purchaseId?: string;
  withdrawalId?: string;
  paymentReference?: string;
  extra?: Record<string, string | number | boolean | null | undefined>;
}

// Captures an exception. Use when a caught error represents an unexpected
// infrastructure or external-service failure. Callers should still call
// console.error before this to preserve local log visibility.
export function captureException(error: unknown, context?: CaptureContext): void {
  Sentry.withScope((scope) => {
    applyContext(scope, context);
    Sentry.captureException(error);
  });
}

// Captures a warning-level event — for anomalies that don't throw (e.g.
// Flutterwave amount mismatches, failed transfer outcomes, unexpected states).
export function captureWarning(message: string, context?: CaptureContext): void {
  Sentry.withScope((scope) => {
    applyContext(scope, context);
    Sentry.captureMessage(message, "warning");
  });
}

function applyContext(scope: Sentry.Scope, context?: CaptureContext): void {
  if (!context) return;

  if (context.userId) {
    scope.setUser({ id: context.userId });
  }
  if (context.textbookId) scope.setTag("textbook_id", context.textbookId);
  if (context.purchaseId) scope.setTag("purchase_id", context.purchaseId);
  if (context.withdrawalId) scope.setTag("withdrawal_id", context.withdrawalId);
  if (context.paymentReference) scope.setTag("payment_reference", context.paymentReference);
  if (context.extra) {
    scope.setExtras(context.extra as Record<string, unknown>);
  }
}
