import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { initiateTransfer } from "@/lib/flutterwave";
import { WITHDRAWAL_SELECT_FIELDS as SELECT_FIELDS } from "@/lib/withdrawals/select";
import { captureException } from "@/lib/monitoring";

// ── PATCH /api/admin/withdrawals/[id] ───────────────────────────────────────
// Approves (triggers an automated Flutterwave transfer) or rejects a pending
// withdrawal request.
//
// Transaction safety (preserved from Paystack implementation):
//  - The DB row is atomically claimed with updateMany(PENDING → PROCESSING)
//    BEFORE calling Flutterwave. If another request already moved the row out
//    of PENDING, count === 0 and we bail — no double-transfer.
//  - On Flutterwave API failure we revert the claim (PROCESSING → PENDING)
//    so the withdrawal remains actionable.
//
// Admin approval workflow:
//  PENDING  → (admin APPROVED) → PROCESSING → (webhook transfer.completed) → PAID
//  PENDING  → (admin REJECTED) → REJECTED
//  PROCESSING → (webhook transfer.failed)  → FAILED
//
// Flutterwave difference: no pre-created transfer recipient. Bank details
// (bankAccountNumber, bankCode, bankAccountName) are passed directly.
// Amount is in Naira (not kobo — Flutterwave uses the base currency unit).

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const status = (body as { status?: unknown }).status;
  if (status !== "APPROVED" && status !== "REJECTED") {
    return NextResponse.json({ error: "Status must be APPROVED or REJECTED" }, { status: 422 });
  }

  // ── REJECTED path ────────────────────────────────────────────────────────
  if (status === "REJECTED") {
    const withdrawal = await db.withdrawalRequest.findUnique({
      where: { id },
      select: { status: true },
    });

    if (!withdrawal) {
      return NextResponse.json({ error: "Withdrawal request not found" }, { status: 404 });
    }
    if (withdrawal.status !== "PENDING") {
      return NextResponse.json({ error: "This request has already been reviewed" }, { status: 422 });
    }

    const updated = await db.withdrawalRequest.update({
      where: { id },
      data: { status: "REJECTED", reviewedAt: new Date() },
      select: SELECT_FIELDS,
    });

    return NextResponse.json({ success: true, withdrawal: updated });
  }

  // ── APPROVED path — initiate an automated payout ─────────────────────────

  const withdrawal = await db.withdrawalRequest.findUnique({
    where: { id },
    select: {
      id: true,
      amount: true,
      status: true,
      lecturer: {
        select: {
          bankAccountNumber: true,
          bankCode: true,
          bankAccountName: true,
          bankAccountVerifiedAt: true,
        },
      },
    },
  });

  if (!withdrawal) {
    return NextResponse.json({ error: "Withdrawal request not found" }, { status: 404 });
  }
  if (withdrawal.status !== "PENDING") {
    return NextResponse.json({ error: "This request has already been reviewed" }, { status: 422 });
  }
  if (!withdrawal.lecturer.bankAccountNumber || !withdrawal.lecturer.bankCode) {
    return NextResponse.json(
      { error: "Lecturer has not set up a payout account" },
      { status: 422 },
    );
  }
  if (!withdrawal.lecturer.bankAccountVerifiedAt) {
    return NextResponse.json(
      { error: "Lecturer's bank account has not been verified" },
      { status: 422 },
    );
  }

  const transferReference = `WD_${withdrawal.id}`;

  // Atomically claim the withdrawal before calling Flutterwave. If another
  // request already moved it out of PENDING (e.g. a double-click), this
  // updates zero rows and we bail without initiating a second transfer.
  const claimed = await db.withdrawalRequest.updateMany({
    where: { id, status: "PENDING" },
    data: { status: "PROCESSING", transferReference, reviewedAt: new Date() },
  });

  if (claimed.count === 0) {
    return NextResponse.json({ error: "This request has already been reviewed" }, { status: 422 });
  }

  try {
    const transfer = await initiateTransfer({
      amountNaira: Number(withdrawal.amount),
      accountNumber: withdrawal.lecturer.bankAccountNumber,
      bankCode: withdrawal.lecturer.bankCode,
      accountName: withdrawal.lecturer.bankAccountName ?? withdrawal.lecturer.bankAccountNumber,
      narration: `Apex lecturer payout — withdrawal ${withdrawal.id}`,
      reference: transferReference,
    });

    const updated = await db.withdrawalRequest.update({
      where: { id },
      data: { transferCode: transfer.transferId },
      select: SELECT_FIELDS,
    });

    return NextResponse.json({ success: true, withdrawal: updated });
  } catch (error) {
    // Flutterwave rejected the transfer — revert the claim so the withdrawal
    // stays PENDING and actionable.
    await db.withdrawalRequest.update({
      where: { id },
      data: { status: "PENDING", transferReference: null, reviewedAt: null },
    });

    const message = error instanceof Error ? error.message : "Failed to initiate transfer";
    captureException(error, {
      userId: session.user.id,
      withdrawalId: id,
      extra: { transferReference, amountNaira: Number(withdrawal.amount) },
    });
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
