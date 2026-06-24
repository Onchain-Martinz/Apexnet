import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { withdrawalRequestSchema } from "@/lib/validations/withdrawal";
import { computeLecturerPayoutBalances } from "@/lib/payouts/settlement";
import { captureException } from "@/lib/monitoring";

// ── GET /api/lecturer/withdrawals ───────────────────────────────────────────
// Returns settlement-aware payout balances and payout request history.

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "LECTURER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const lecturerProfile = await db.lecturerProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });

    if (!lecturerProfile) {
      return NextResponse.json({ error: "Lecturer profile not found" }, { status: 404 });
    }

    // computeLecturerPayoutBalances runs as a standalone query (the
    // interactive db.$transaction(async (tx) => ...) form previously used
    // here caused "transaction closed" errors under load — see
    // lecturer/page.tsx for the same pattern). The findMany below is a
    // second, independent standalone query; nothing here needs the two
    // pinned to the same connection.
    const balances = await computeLecturerPayoutBalances(db, lecturerProfile.id);
    const withdrawals = await db.withdrawalRequest.findMany({
      where: { lecturerId: lecturerProfile.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        amount: true,
        status: true,
        createdAt: true,
        reviewedAt: true,
      },
    });

    return NextResponse.json({
      availableBalance: balances.availableNextPayout,
      currentEarnings: balances.currentEarnings,
      pendingSettlement: balances.pendingSettlement,
      availableNextPayout: balances.availableNextPayout,
      requestedPayouts: balances.requestedPayouts,
      settlementWindowHours: balances.settlementWindowHours,
      lastPayoutDate: balances.lastPayoutDate?.toISOString() ?? null,
      withdrawals,
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientInitializationError) {
      console.error("[withdrawals/GET] DB connection pool exhausted", error);
      captureException(error, { userId: session.user.id });
      return NextResponse.json(
        { error: "Service is busy right now. Please try again in a moment." },
        { status: 503 },
      );
    }
    throw error;
  }
}

// ── POST /api/lecturer/withdrawals ──────────────────────────────────────────
// Submits a new payout queue request for the authenticated lecturer.
//
// computeAvailableBalance() runs outside the transaction; the transaction
// itself contains only the withdrawalRequest insert (isolationLevel:
// Serializable, maxWait: 15000, timeout: 30000 — raised from Prisma's
// defaults because round trips to the DB are slow enough in this environment
// that the default 5000ms timeout was being hit under normal load).
//
// Correctness trade-off: Serializable isolation on a lone INSERT has no
// read-set to detect a conflict against, so this does not prevent two
// concurrent requests from each reading a sufficient balance and both
// inserting, combined oversubscribing the balance. That protection existed
// specifically because the balance read and the insert used to share one
// transaction boundary — moving the read out removes it. isolationLevel is
// kept regardless; it is not doing the job it used to for this race.
//
// The retry loop below still guards against Postgres serialization failures
// (P2034) on the insert itself, even though that conflict is now rare given
// the transaction no longer reads anything.

const MAX_SERIALIZATION_RETRIES = 3;

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "LECTURER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = withdrawalRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 422 });
  }

  // Everything below touches the DB. Wrapped in one try/catch so a
  // connection-pool timeout (PrismaClientInitializationError) is caught
  // regardless of which query hits it, including the lecturerProfile lookup.
  try {
    const lecturerProfile = await db.lecturerProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });

    if (!lecturerProfile) {
      return NextResponse.json({ error: "Lecturer profile not found" }, { status: 404 });
    }

    for (let attempt = 1; attempt <= MAX_SERIALIZATION_RETRIES; attempt++) {
      try {
        const balances = await computeLecturerPayoutBalances(db, lecturerProfile.id);

        if (parsed.data.amount > balances.availableNextPayout) {
          throw new InsufficientBalanceError();
        }

        const withdrawal = await db.$transaction(
          async (tx) => {
            return tx.withdrawalRequest.create({
              data: {
                lecturerId: lecturerProfile.id,
                amount: parsed.data.amount,
              },
              select: { id: true, amount: true, status: true, createdAt: true, reviewedAt: true },
            });
          },
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 15000, timeout: 30000 },
        );

        return NextResponse.json({ success: true, withdrawal }, { status: 201 });
      } catch (error) {
        if (error instanceof InsufficientBalanceError) {
          return NextResponse.json(
            { error: "Amount exceeds available next payout" },
            { status: 422 },
          );
        }

        // Postgres serialization failure (40001) — another concurrent
        // withdrawal request committed first. Retry with a fresh balance read.
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
          if (attempt < MAX_SERIALIZATION_RETRIES) continue;
          return NextResponse.json(
            { error: "Too many concurrent requests. Please try again." },
            { status: 409 },
          );
        }

        throw error;
      }
    }

    return NextResponse.json({ error: "Too many concurrent requests. Please try again." }, { status: 409 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientInitializationError) {
      console.error("[withdrawals/POST] DB connection pool exhausted", error);
      captureException(error, { userId: session.user.id });
      return NextResponse.json(
        { error: "Service is busy right now. Please try again in a moment." },
        { status: 503 },
      );
    }

    console.error("[withdrawals/POST] Unexpected error", error);
    captureException(error, { userId: session.user.id });
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}

class InsufficientBalanceError extends Error {}
