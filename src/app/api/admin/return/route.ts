import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { createSessionToken, sessionCookieOptions } from "@/lib/auth/impersonation";

// ── POST /api/admin/return ──────────────────────────────────────────────────
// Ends impersonation and restores the original admin session.

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { impersonatorId, impersonatorRole } = session.user;
  if (!impersonatorId || impersonatorRole !== "ADMIN") {
    return NextResponse.json({ error: "Not currently impersonating" }, { status: 422 });
  }

  const admin = await db.user.findUnique({
    where: { id: impersonatorId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
      emailVerifiedAt: true,
      mustChangePassword: true,
    },
  });

  if (!admin || admin.role !== "ADMIN" || !admin.isActive) {
    return NextResponse.json({ error: "Admin account unavailable" }, { status: 422 });
  }

  const token = await createSessionToken(admin);

  const res = NextResponse.json({ success: true });
  const cookie = sessionCookieOptions();
  res.cookies.set(cookie.name, token, cookie);
  return res;
}
