import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { withdrawalRequestSchema } from "@/lib/validations/withdrawal";

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

  const [revenueAgg, withdrawals] = await Promise.all([
    db.purchase.aggregate({
      _sum: { amount: true },
      where: { status: "COMPLETED", textbook: { lecturerId: lecturerProfile.id } },
    }),
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

  const totalRevenue = Number(revenueAgg._sum.amount ?? 0);
  const reserved = withdrawals
    .filter((w) => w.status !== "REJECTED")
    .reduce((sum, w) => sum + Number(w.amount), 0);

  return NextResponse.json({
    availableBalance: Math.max(0, totalRevenue - reserved),
    withdrawals,
  });
}

// ── POST /api/lecturer/withdrawals ──────────────────────────────────────────
// Submits a new withdrawal request for the authenticated lecturer.

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

  const [revenueAgg, withdrawals] = await Promise.all([
    db.purchase.aggregate({
      _sum: { amount: true },
      where: { status: "COMPLETED", textbook: { lecturerId: lecturerProfile.id } },
    }),
    db.withdrawalRequest.findMany({
      where: { lecturerId: lecturerProfile.id, status: { not: "REJECTED" } },
      select: { amount: true },
    }),
  ]);

  const totalRevenue = Number(revenueAgg._sum.amount ?? 0);
  const reserved = withdrawals.reduce((sum, w) => sum + Number(w.amount), 0);
  const availableBalance = Math.max(0, totalRevenue - reserved);

  if (parsed.data.amount > availableBalance) {
    return NextResponse.json(
      { error: "Amount exceeds available balance" },
      { status: 422 },
    );
  }

  const withdrawal = await db.withdrawalRequest.create({
    data: {
      lecturerId: lecturerProfile.id,
      amount: parsed.data.amount,
    },
    select: { id: true, amount: true, status: true, createdAt: true, reviewedAt: true },
  });

  return NextResponse.json({ success: true, withdrawal }, { status: 201 });
}
