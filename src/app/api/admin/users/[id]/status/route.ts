import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

// ── PATCH /api/admin/users/[id]/status ──────────────────────────────────────
// [id] is User.id. Toggles User.isActive (suspend/unsuspend). Suspended
// users cannot sign in — enforced in src/auth.ts's authorize().

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

  const isActive = (body as { isActive?: unknown }).isActive;
  if (typeof isActive !== "boolean") {
    return NextResponse.json({ error: "isActive must be a boolean" }, { status: 422 });
  }

  const user = await db.user.findUnique({ where: { id }, select: { id: true, role: true } });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  if (user.role === "ADMIN") {
    return NextResponse.json({ error: "Cannot change status of an admin account" }, { status: 422 });
  }
  if (user.id === session.user.id) {
    return NextResponse.json({ error: "Cannot change your own status" }, { status: 422 });
  }

  const updated = await db.user.update({
    where: { id },
    data: { isActive },
    select: { id: true, isActive: true },
  });

  return NextResponse.json({ success: true, user: updated });
}
