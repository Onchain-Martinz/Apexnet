import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { getAvailableBalance, initiateTransfer } from "@/lib/flutterwave";
import { WITHDRAWAL_SELECT_FIELDS as SELECT_FIELDS } from "@/lib/withdrawals/select";
import type { Prisma } from "@prisma/client";
import { captureException } from "@/lib/monitoring";
import { computeLecturerPayoutBalances } from "@/lib/payouts/settlement";

// ── POST /api/admin/withdrawals/[id]/retry ──────────────────────────────────
// Retries a FAILED withdrawal by initiating a new Flutterwave transfer with a
// fresh reference (WD_<id>_R<attempt>). Only FAILED withdrawals are retryable.
//
// Retry safety (preserved from Paystack implementation):
//  - retryCount is incremented atomically with the FAILED → PROCESSING claim.
//  - The previous failure reason is appended to failureHistory before clearing.
//  - The new transferReference is unique per attempt (WD_<id>_R1, _R2, …)
//    so Flutterwave never sees a duplicate reference across retries.
//  - On Flutterwave API failure we revert to FAILED (re-retryable) and record
//    the new failure reason.

interface FailureHistoryEntry {
  reference: string | null;
  reason: string | null;
}

export async function POST(
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

  const withdrawal = await db.withdrawalRequest.findUnique({
    where: { id },
    select: {
      id: true,
      lecturerId: true,
      amount: true,
      status: true,
      retryCount: true,
      transferReference: true,
      failureReason: true,
      failureHistory: true,
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
  if (withdrawal.status !== "FAILED") {
    return NextResponse.json({ error: "Only failed withdrawals can be retried" }, { status: 422 });
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

  const amountNaira = Number(withdrawal.amount);
  const payoutBalances = await computeLecturerPayoutBalances(db, withdrawal.lecturerId, {
    excludeRequestId: withdrawal.id,
  });

  if (amountNaira > payoutBalances.availableNextPayout) {
    return NextResponse.json(
      { error: "This payout request exceeds the lecturer's settled eligible amount" },
      { status: 422 },
    );
  }

  let flutterwaveBalance: Awaited<ReturnType<typeof getAvailableBalance>>;
  try {
    flutterwaveBalance = await getAvailableBalance("NGN");
  } catch (error) {
    captureException(error, {
      userId: session.user.id,
      withdrawalId: id,
      extra: { amountNaira },
    });
    return NextResponse.json(
      { error: "Could not confirm Flutterwave available balance. Payout remains retryable." },
      { status: 502 },
    );
  }

  if (flutterwaveBalance.availableBalance < amountNaira) {
    return NextResponse.json(
      {
        error: `Insufficient Flutterwave available balance. Available: ₦${flutterwaveBalance.availableBalance.toLocaleString("en-NG")}`,
      },
      { status: 422 },
    );
  }

  const attempt = withdrawal.retryCount + 1;
  const transferReference = `WD_${withdrawal.id}_R${attempt}`;

  // Preserve the prior attempt's failure reason in history before clearing it.
  const history: FailureHistoryEntry[] = Array.isArray(withdrawal.failureHistory)
    ? (withdrawal.failureHistory as unknown as FailureHistoryEntry[])
    : [];
  const updatedHistory: FailureHistoryEntry[] = [
    ...history,
    { reference: withdrawal.transferReference, reason: withdrawal.failureReason },
  ];

  // Atomically claim the withdrawal before calling Flutterwave. If another
  // retry request already moved it out of FAILED, this updates zero rows —
  // preventing multiple active retries for the same withdrawal.
  const claimed = await db.withdrawalRequest.updateMany({
    where: { id, status: "FAILED" },
    data: {
      status: "PROCESSING",
      transferReference,
      retryCount: attempt,
      failureReason: null,
      failureHistory: updatedHistory as unknown as Prisma.InputJsonValue,
      reviewedAt: new Date(),
    },
  });

  if (claimed.count === 0) {
    return NextResponse.json(
      { error: "This withdrawal already has an active retry" },
      { status: 422 },
    );
  }

  try {
    const transfer = await initiateTransfer({
      amountNaira,
      accountNumber: withdrawal.lecturer.bankAccountNumber,
      bankCode: withdrawal.lecturer.bankCode,
      accountName:
        withdrawal.lecturer.bankAccountName ?? withdrawal.lecturer.bankAccountNumber,
      narration: `Apex lecturer payout (retry ${attempt}) — withdrawal ${withdrawal.id}`,
      reference: transferReference,
    });

    const updated = await db.withdrawalRequest.update({
      where: { id },
      data: { transferCode: transfer.transferId },
      select: SELECT_FIELDS,
    });

    return NextResponse.json({ success: true, withdrawal: updated });
  } catch (error) {
    // Flutterwave rejected the retry — revert to FAILED so it remains
    // retryable, recording the new failure reason.
    const message = error instanceof Error ? error.message : "Failed to initiate transfer";
    await db.withdrawalRequest.update({
      where: { id },
      data: { status: "FAILED", failureReason: message },
    });
    captureException(error, {
      userId: session.user.id,
      withdrawalId: id,
      extra: { attempt, transferReference },
    });
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
