import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from "@/lib/rate-limit";
import { captureException } from "@/lib/monitoring";

// ── POST /api/purchases/initialize ──────────────────────────────────────────
// Finds or creates a PENDING purchase row and returns the data needed by the
// client-side Flutterwave Inline SDK to open the payment modal.
//
// Response: { txRef, amount, email }
// The SDK handles the checkout UI; server-side Flutterwave calls are only
// needed at verification time (GET /v3/transactions/:id/verify via V4 OAuth).
//
// Idempotency:
//  - A partial unique index on (studentId, textbookId) WHERE status='PENDING'
//    ensures only one PENDING purchase per (student, textbook) pair at a time.
//  - Concurrent creates race; the loser gets P2002 and reads the winner's row.
//
// Policy A — price changes invalidate pending purchases:
//  - A PENDING purchase's `amount` is fixed at the price the moment it was
//    created. If the lecturer edits the price before the student finishes
//    checkout and the student then resumes (or retries) that same checkout,
//    reusing the stale PENDING row would hand the SDK the textbook's CURRENT
//    price to charge while the DB still expects the OLD one — Flutterwave
//    charges correctly, but completePurchaseByReference()'s amount-integrity
//    check then sees a false mismatch and fails an otherwise legitimate
//    payment (see APX_dfdddb3d-... incident).
//  - Fix: only reuse an existing PENDING purchase when its stored amount
//    still matches the textbook's current price. Otherwise mark it FAILED
//    (it can never be completed correctly — its amount no longer reflects
//    reality) and create a fresh PENDING row at the current price.

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "STUDENT") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const rateLimit = checkRateLimit(
    `purchase-init:${session.user.id}`,
    RATE_LIMITS.PURCHASE_INITIALIZE,
  );
  if (!rateLimit.allowed) {
    return rateLimitResponse(rateLimit);
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

  // ── Find-or-create the PENDING purchase ─────────────────────────────────
  let purchase: { id: string; paymentReference: string };

  const existingPending = await db.purchase.findFirst({
    where: { studentId: session.user.id, textbookId, status: "PENDING" },
    select: { id: true, paymentReference: true, amount: true },
  });

  const reusable = existingPending && Number(existingPending.amount) === price;

  if (reusable) {
    purchase = existingPending;
  } else {
    if (existingPending) {
      // Stale — the price moved since this PENDING purchase was created.
      // Invalidate it so it can never be matched against the new amount.
      await db.purchase.updateMany({
        where: { id: existingPending.id, status: "PENDING" },
        data: { status: "FAILED" },
      });
    }
    try {
      purchase = await db.purchase.create({
        data: {
          studentId: session.user.id,
          textbookId,
          amount: textbook.price,
          paymentReference: `APX_${randomUUID()}`,
          status: "PENDING",
        },
        select: { id: true, paymentReference: true },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        const winner = await db.purchase.findFirst({
          where: { studentId: session.user.id, textbookId, status: "PENDING" },
          select: { id: true, paymentReference: true },
        });
        if (!winner) {
          captureException(new Error("P2002 race but no PENDING row found"), {
            userId: session.user.id,
            textbookId,
          });
          return NextResponse.json({ error: "Failed to start checkout" }, { status: 502 });
        }
        purchase = winner;
      } else {
        throw error;
      }
    }
  }

  return NextResponse.json({
    txRef: purchase.paymentReference,
    amount: price,
    email: session.user.email,
  });
}
