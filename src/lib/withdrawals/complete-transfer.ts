import { db } from "@/lib/db";
import { captureWarning } from "@/lib/monitoring";

// ── Transfer webhook completion ──────────────────────────────────────────────
// Called from the Flutterwave webhook for transfer.completed / transfer.failed
// events. Locates the WithdrawalRequest by its transferReference and applies
// the corresponding state transition.
//
// Idempotency (preserved from Paystack implementation):
//  - The status guard on updateMany (WHERE status = 'PROCESSING') ensures the
//    PROCESSING → PAID/FAILED transition only fires once. Duplicate webhook
//    deliveries (Flutterwave retries on 5xx) are absorbed safely.
//
// Note: Flutterwave does not emit a separate "transfer.reversed" event.
// Reversals arrive as "transfer.failed" with an explanatory complete_message.
// The "reversed" outcome type has been removed accordingly.

export type TransferOutcome = "success" | "failed";

export type TransferCompletionStatus = "updated" | "already_processed" | "not_found";

export async function completeTransferByReference(
  reference: string,
  outcome: TransferOutcome,
  failureReason?: string | null,
): Promise<TransferCompletionStatus> {
  const withdrawal = await db.withdrawalRequest.findUnique({
    where: { transferReference: reference },
    select: { id: true, status: true },
  });

  if (!withdrawal) {
    return "not_found";
  }

  if (outcome === "success") {
    // Conditional update: only transition PROCESSING → PAID. If a previous
    // delivery already applied it, count is 0 and we return already_processed.
    const { count } = await db.withdrawalRequest.updateMany({
      where: { id: withdrawal.id, status: "PROCESSING" },
      data: { status: "PAID", paidAt: new Date() },
    });
    return count > 0 ? "updated" : "already_processed";
  }

  // "failed" — also covers Flutterwave reversals (no separate event).
  const { count } = await db.withdrawalRequest.updateMany({
    where: { id: withdrawal.id, status: "PROCESSING" },
    data: {
      status: "FAILED",
      failureReason: failureReason ?? `Flutterwave transfer.${outcome}`,
    },
  });

  if (count > 0) {
    captureWarning(`Flutterwave transfer.${outcome}`, {
      withdrawalId: withdrawal.id,
      paymentReference: reference,
      extra: { failureReason: failureReason ?? null, outcome },
    });
  }

  return count > 0 ? "updated" : "already_processed";
}
