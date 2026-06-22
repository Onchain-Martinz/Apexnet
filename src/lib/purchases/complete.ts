import { db } from "@/lib/db";
import { verifyTransactionById, verifyTransactionByRef } from "@/lib/flutterwave";
import { captureWarning } from "@/lib/monitoring";

// ── Shared purchase completion ───────────────────────────────────────────────
// Called from both the Flutterwave webhook and the client-side callback page.
// Always re-verifies the transaction directly with Flutterwave rather than
// trusting the caller's payload. Safe to call multiple times for the same
// reference (idempotent): every state transition is guarded by a conditional
// updateMany that only succeeds when the purchase is still PENDING.
//
// Idempotency model (preserved from Paystack implementation):
//  - Webhook and callback race: both call completePurchaseByReference. The first
//    to execute the updateMany(PENDING → COMPLETED) wins (count === 1); the
//    second sees count === 0 and returns "already_completed".
//  - Flutterwave webhook retries: same guarantee — updateMany is a no-op if the
//    purchase is no longer PENDING.
//
// Verification strategy:
//  - When flwTransactionId is provided (webhook data.id or callback ?transaction_id=),
//    we call GET /v3/transactions/:id/verify — fastest and most precise.
//  - When only the reference is available (/api/purchases/verify fallback),
//    we query GET /v3/transactions?tx_ref= and pick the successful row.

export type CompletionStatus =
  | "completed"
  | "already_completed"
  | "pending"
  | "failed"
  | "not_found";

export interface CompletionResult {
  status: CompletionStatus;
  textbookId?: string;
  studentId?: string;
}

export async function completePurchaseByReference(
  reference: string,
  flwTransactionId?: number | string,
): Promise<CompletionResult> {
  const purchase = await db.purchase.findUnique({
    where: { paymentReference: reference },
    select: { id: true, studentId: true, textbookId: true, status: true, amount: true },
  });

  if (!purchase) {
    return { status: "not_found" };
  }

  if (purchase.status === "COMPLETED") {
    return {
      status: "already_completed",
      textbookId: purchase.textbookId,
      studentId: purchase.studentId,
    };
  }

  // Re-verify with Flutterwave before touching the DB.
  const verification = flwTransactionId
    ? await verifyTransactionById(flwTransactionId)
    : await verifyTransactionByRef(reference);

  if (!verification || verification.status !== "successful") {
    // "failed" / "cancelled" are terminal — mark PENDING → FAILED once.
    const isTerminal =
      verification?.status === "failed" || verification?.status === "cancelled";

    if (isTerminal && purchase.status !== "FAILED") {
      const { count } = await db.purchase.updateMany({
        where: { id: purchase.id, status: "PENDING" },
        data: { status: "FAILED" },
      });
      if (count === 0) {
        return {
          status: "already_completed",
          textbookId: purchase.textbookId,
          studentId: purchase.studentId,
        };
      }
      return { status: "failed", textbookId: purchase.textbookId, studentId: purchase.studentId };
    }
    // Non-terminal (null / "pending" / "cancelled" etc.) — tell the caller to wait.
    return { status: "pending", textbookId: purchase.textbookId, studentId: purchase.studentId };
  }

  // ── Amount integrity check ──────────────────────────────────────────────
  // Flutterwave returns amounts in Naira. Convert both sides to integer kobo
  // to avoid float comparison errors.
  const expectedKobo = Math.round(Number(purchase.amount) * 100);
  const receivedKobo = Math.round(verification.amountNaira * 100);

  if (expectedKobo !== receivedKobo) {
    console.error(
      `[flutterwave] Amount mismatch for reference ${reference}: ` +
        `expected ${expectedKobo} kobo, received ${receivedKobo} kobo`,
    );
    captureWarning("Flutterwave amount mismatch on purchase completion", {
      purchaseId: purchase.id,
      paymentReference: reference,
      extra: { expectedKobo, receivedKobo },
    });
    const { count } = await db.purchase.updateMany({
      where: { id: purchase.id, status: "PENDING" },
      data: { status: "FAILED" },
    });
    if (count === 0) {
      return {
        status: "already_completed",
        textbookId: purchase.textbookId,
        studentId: purchase.studentId,
      };
    }
    return { status: "failed", textbookId: purchase.textbookId, studentId: purchase.studentId };
  }

  // ── Completion gate ──────────────────────────────────────────────────────
  // Atomically transition PENDING → COMPLETED. Only one concurrent caller
  // (webhook vs. callback) wins — count === 1 for winner, 0 for everyone else.
  // Only the winner writes to StudentLibrary.
  const { count } = await db.purchase.updateMany({
    where: { id: purchase.id, status: "PENDING" },
    data: {
      status: "COMPLETED",
      paidAt: verification.chargedAt ? new Date(verification.chargedAt) : new Date(),
      paymentChannel: verification.paymentType,
    },
  });

  if (count === 0) {
    return {
      status: "already_completed",
      textbookId: purchase.textbookId,
      studentId: purchase.studentId,
    };
  }

  await db.studentLibrary.upsert({
    where: {
      studentId_textbookId: {
        studentId: purchase.studentId,
        textbookId: purchase.textbookId,
      },
    },
    create: {
      studentId: purchase.studentId,
      textbookId: purchase.textbookId,
      purchaseId: purchase.id,
    },
    update: { purchaseId: purchase.id },
  });

  return {
    status: "completed",
    textbookId: purchase.textbookId,
    studentId: purchase.studentId,
  };
}
