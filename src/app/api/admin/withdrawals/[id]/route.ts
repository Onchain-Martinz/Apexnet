import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { WITHDRAWAL_SELECT_FIELDS as SELECT_FIELDS } from "@/lib/withdrawals/select";
import { computeLecturerPayoutBalances } from "@/lib/payouts/settlement";

// ── PATCH /api/admin/withdrawals/[id] ───────────────────────────────────────
// Approves, rejects, or marks a withdrawal request as paid.
//
// Pilot manual-payout workflow — no automated transfer is initiated by this
// app. The admin reviews and approves in-app, then carries out the actual
// bank transfer manually outside the app (Flutterwave's dashboard or direct
// bank transfer), then marks the request Paid once the money has moved:
//
//  PENDING → (admin APPROVED) → APPROVED → (admin marks Paid) → PAID
//  PENDING → (admin REJECTED) → REJECTED
//
// Automated transfer initiation (initiateTransfer/getAvailableBalance) was
// removed from this route — Flutterwave transfer/IP-whitelist restrictions
// made it unreliable for pilot launch. See WithdrawalRequest.transferCode/
// transferReference/failureReason/retryCount — still present in the schema,
// now unused by this route, kept for any pre-existing rows and in case
// automated transfers return post-pilot.

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
  if (status !== "APPROVED" && status !== "REJECTED" && status !== "PAID") {
    return NextResponse.json({ error: "Status must be APPROVED, REJECTED, or PAID" }, { status: 422 });
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

  // ── PAID path — admin has completed the manual bank transfer ─────────────
  if (status === "PAID") {
    const withdrawal = await db.withdrawalRequest.findUnique({
      where: { id },
      select: { status: true },
    });

    if (!withdrawal) {
      return NextResponse.json({ error: "Withdrawal request not found" }, { status: 404 });
    }
    if (withdrawal.status !== "APPROVED") {
      return NextResponse.json({ error: "Only approved requests can be marked as paid" }, { status: 422 });
    }

    const updated = await db.withdrawalRequest.update({
      where: { id },
      data: { status: "PAID", paidAt: new Date() },
      select: SELECT_FIELDS,
    });

    return NextResponse.json({ success: true, withdrawal: updated });
  }

  // ── APPROVED path — validate and approve for manual payout ───────────────

  const withdrawal = await db.withdrawalRequest.findUnique({
    where: { id },
    select: {
      id: true,
      lecturerId: true,
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

  const payoutBalances = await computeLecturerPayoutBalances(db, withdrawal.lecturerId, {
    excludeRequestId: withdrawal.id,
  });
  const amountNaira = Number(withdrawal.amount);

  if (amountNaira > payoutBalances.availableNextPayout) {
    return NextResponse.json(
      { error: "This payout request exceeds the lecturer's settled eligible amount" },
      { status: 422 },
    );
  }

  // Atomically claim the withdrawal. If another request already moved it out
  // of PENDING (e.g. a double-click), this updates zero rows.
  const claimed = await db.withdrawalRequest.updateMany({
    where: { id, status: "PENDING" },
    data: { status: "APPROVED", reviewedAt: new Date() },
  });

  if (claimed.count === 0) {
    return NextResponse.json({ error: "This request has already been reviewed" }, { status: 422 });
  }

  const updated = await db.withdrawalRequest.findUnique({ where: { id }, select: SELECT_FIELDS });
  return NextResponse.json({ success: true, withdrawal: updated });
}
