import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { initializeTransaction, nairaToKobo } from "@/lib/paystack";

// ── POST /api/purchases/initialize ──────────────────────────────────────────
// Starts a Paystack checkout for a paid, published textbook.
// Body: { textbookId: string }

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "STUDENT") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const textbookId = (body as { textbookId?: unknown }).textbookId;
  if (typeof textbookId !== "string" || !textbookId) {
    return NextResponse.json({ error: "textbookId is required" }, { status: 422 });
  }

  const textbook = await db.textbook.findUnique({
    where: { id: textbookId },
    select: { id: true, price: true, isFree: true, status: true },
  });

  if (!textbook || textbook.status !== "PUBLISHED") {
    return NextResponse.json({ error: "Textbook not found" }, { status: 404 });
  }

  const price = Number(textbook.price);
  if (textbook.isFree || price <= 0) {
    return NextResponse.json({ error: "This textbook is free" }, { status: 422 });
  }

  const alreadyOwned = await db.studentLibrary.findUnique({
    where: { studentId_textbookId: { studentId: session.user.id, textbookId } },
    select: { id: true },
  });
  if (alreadyOwned) {
    return NextResponse.json({ error: "You already own this textbook" }, { status: 422 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  // Reuse an existing in-flight purchase attempt instead of creating a second one.
  const existingPending = await db.purchase.findFirst({
    where: { studentId: session.user.id, textbookId, status: "PENDING" },
    select: { id: true, paystackReference: true, paystackAccessCode: true },
  });

  if (existingPending?.paystackAccessCode) {
    return NextResponse.json({
      authorizationUrl: `https://checkout.paystack.com/${existingPending.paystackAccessCode}`,
      reference: existingPending.paystackReference,
    });
  }

  const purchase = existingPending
    ? existingPending
    : await db.purchase.create({
        data: {
          studentId: session.user.id,
          textbookId,
          amount: textbook.price,
          paystackReference: `APX_${randomUUID()}`,
          status: "PENDING",
        },
        select: { id: true, paystackReference: true, paystackAccessCode: true },
      });

  const reference = purchase.paystackReference;

  try {
    const transaction = await initializeTransaction({
      email: session.user.email,
      amountKobo: nairaToKobo(price),
      reference,
      callbackUrl: `${appUrl}/student/purchases/callback`,
      metadata: { textbookId, studentId: session.user.id, purchaseId: purchase.id },
    });

    await db.purchase.update({
      where: { id: purchase.id },
      data: { paystackAccessCode: transaction.accessCode },
    });

    return NextResponse.json({
      authorizationUrl: transaction.authorizationUrl,
      reference,
    });
  } catch (error) {
    await db.purchase.update({ where: { id: purchase.id }, data: { status: "FAILED" } });
    const message = error instanceof Error ? error.message : "Failed to start checkout";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
