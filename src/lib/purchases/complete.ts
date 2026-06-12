import { db } from "@/lib/db";
import { nairaToKobo, verifyTransaction } from "@/lib/paystack";

// ── Shared purchase completion ───────────────────────────────────────────────
// Called from both the Paystack webhook and the client-side verify endpoint.
// Always re-verifies against Paystack directly (rather than trusting the
// caller's payload) and is idempotent — safe to call multiple times for the
// same reference.

export type CompletionStatus = "completed" | "already_completed" | "pending" | "failed" | "not_found";

export interface CompletionResult {
  status: CompletionStatus;
  textbookId?: string;
  studentId?: string;
}

export async function completePurchaseByReference(reference: string): Promise<CompletionResult> {
  const purchase = await db.purchase.findUnique({
    where: { paystackReference: reference },
    select: { id: true, studentId: true, textbookId: true, status: true, amount: true },
  });

  if (!purchase) {
    return { status: "not_found" };
  }

  if (purchase.status === "COMPLETED") {
    return { status: "already_completed", textbookId: purchase.textbookId, studentId: purchase.studentId };
  }

  const verification = await verifyTransaction(reference);

  if (verification.status !== "success") {
    if (verification.status !== "abandoned" && purchase.status !== "FAILED") {
      await db.purchase.update({ where: { id: purchase.id }, data: { status: "FAILED" } });
      return { status: "failed", textbookId: purchase.textbookId, studentId: purchase.studentId };
    }
    return { status: "pending", textbookId: purchase.textbookId, studentId: purchase.studentId };
  }

  const expectedAmountKobo = nairaToKobo(Number(purchase.amount));
  if (verification.amountKobo !== expectedAmountKobo) {
    console.error(
      `[paystack] Amount mismatch for reference ${reference}: expected ${expectedAmountKobo} kobo, received ${verification.amountKobo} kobo`,
    );
    await db.purchase.update({ where: { id: purchase.id }, data: { status: "FAILED" } });
    return { status: "failed", textbookId: purchase.textbookId, studentId: purchase.studentId };
  }

  await db.$transaction([
    db.purchase.update({
      where: { id: purchase.id },
      data: {
        status: "COMPLETED",
        paidAt: verification.paidAt ? new Date(verification.paidAt) : new Date(),
        paystackChannel: verification.channel,
      },
    }),
    db.studentLibrary.upsert({
      where: {
        studentId_textbookId: { studentId: purchase.studentId, textbookId: purchase.textbookId },
      },
      create: {
        studentId: purchase.studentId,
        textbookId: purchase.textbookId,
        purchaseId: purchase.id,
      },
      update: { purchaseId: purchase.id },
    }),
  ]);

  return { status: "completed", textbookId: purchase.textbookId, studentId: purchase.studentId };
}
