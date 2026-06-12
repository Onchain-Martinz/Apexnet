import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { completePurchaseByReference } from "@/lib/purchases/complete";

// ── GET /api/purchases/verify?reference= ────────────────────────────────────
// Fallback completion path for the browser redirect back from Paystack
// checkout. Re-verifies the transaction and applies the same idempotent
// completion logic as the webhook.

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const reference = req.nextUrl.searchParams.get("reference");
  if (!reference) {
    return NextResponse.json({ error: "reference is required" }, { status: 422 });
  }

  const purchase = await db.purchase.findUnique({
    where: { paystackReference: reference },
    select: { studentId: true, textbookId: true },
  });

  if (!purchase || purchase.studentId !== session.user.id) {
    return NextResponse.json({ error: "Purchase not found" }, { status: 404 });
  }

  const result = await completePurchaseByReference(reference);

  return NextResponse.json({ status: result.status, textbookId: purchase.textbookId });
}
