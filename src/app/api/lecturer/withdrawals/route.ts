import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { withdrawalRequestSchema } from "@/lib/validations/withdrawal";
import { computeAvailableBalance } from "@/lib/withdrawals/balance";

// ── GET /api/lecturer/withdrawals ───────────────────────────────────────────
// Returns the lecturer's available balance and withdrawal request history.

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "LECTURER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const lecturerProfile = await db.lecturerProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });

  if (!lecturerProfile) {
    return NextResponse.json({ error: "Lecturer profile not found" }, { status: 404 });
  }

  const [availableBalance, withdrawals] = await Promise.all([
    computeAvailableBalance(db, lecturerProfile.id),
    db.withdrawalRequest.findMany({
      where: { lecturerId: lecturerProfile.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        amount: true,
        status: true,
        createdAt: true,
        reviewedAt: true,
      },
    }),
  ]);

  return NextResponse.json({ availableBalance, withdrawals });
}

// ── POST /api/lecturer/withdrawals ──────────────────────────────────────────
// Submits a new withdrawal request for the authenticated lecturer.
//
// Balance validation + creation happen inside a single Serializable
// transaction so concurrent requests can't both read the same available
// balance and both insert a WithdrawalRequest that, combined, oversubscribe
// it. Postgres aborts the loser with a serialization failure (Prisma error
// P2034), which we retry a few times before giving up.

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

  const lecturerProfile = await db.lecturerProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });

  if (!lecturerProfile) {
    return NextResponse.json({ error: "Lecturer profile not found" }, { status: 404 });
  }

  for (let attempt = 1; attempt <= MAX_SERIALIZATION_RETRIES; attempt++) {
    try {
      const withdrawal = await db.$transaction(
        async (tx) => {
          const availableBalance = await computeAvailableBalance(tx, lecturerProfile.id);

          if (parsed.data.amount > availableBalance) {
            throw new InsufficientBalanceError();
          }

          return tx.withdrawalRequest.create({
            data: {
              lecturerId: lecturerProfile.id,
              amount: parsed.data.amount,
            },
            select: { id: true, amount: true, status: true, createdAt: true, reviewedAt: true },
          });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );

      return NextResponse.json({ success: true, withdrawal }, { status: 201 });
    } catch (error) {
      if (error instanceof InsufficientBalanceError) {
        return NextResponse.json({ error: "Amount exceeds available balance" }, { status: 422 });
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
}

class InsufficientBalanceError extends Error {}
