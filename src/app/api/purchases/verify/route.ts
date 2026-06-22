import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { completePurchaseByReference } from "@/lib/purchases/complete";

// ── GET /api/purchases/verify?reference=&transaction_id= ────────────────────
// Client-callable fallback completion path. Re-verifies the transaction with
// Flutterwave and applies the same idempotent completion logic as the webhook.
//
// transaction_id is optional but improves verification accuracy — when present,
// Flutterwave is queried by ID (GET /v3/transactions/:id/verify) rather than
// by reference (slower query-based lookup).

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const reference = req.nextUrl.searchParams.get("reference");
  const transactionIdParam = req.nextUrl.searchParams.get("transaction_id");

  if (!reference) {
    return NextResponse.json({ error: "reference is required" }, { status: 422 });
  }

  const purchase = await db.purchase.findUnique({
    where: { paymentReference: reference },
    select: { studentId: true, textbookId: true },
  });

  if (!purchase || purchase.studentId !== session.user.id) {
    return NextResponse.json({ error: "Purchase not found" }, { status: 404 });
  }

  const flwTransactionId = transactionIdParam ? Number(transactionIdParam) : undefined;
  const result = await completePurchaseByReference(reference, flwTransactionId);

  return NextResponse.json({ status: result.status, textbookId: purchase.textbookId });
}
