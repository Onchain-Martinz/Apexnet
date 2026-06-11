import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

// ── PATCH /api/admin/withdrawals/[id] ───────────────────────────────────────
// Approves or rejects a pending withdrawal request.

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
    data: { status, reviewedAt: new Date() },
    select: { id: true, amount: true, status: true, createdAt: true, reviewedAt: true },
  });

  return NextResponse.json({ success: true, withdrawal: updated });
}
