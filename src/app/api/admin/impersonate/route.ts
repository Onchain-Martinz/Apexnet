import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { createSessionToken, sessionCookieOptions } from "@/lib/auth/impersonation";

// ── POST /api/admin/impersonate ─────────────────────────────────────────────
// Lets an admin "Login As" a student or lecturer, without a password.
// The admin's identity is preserved in the new token so the session can
// later "Return to Admin" (see /api/admin/return).

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const userId = (body as { userId?: unknown }).userId;
  if (typeof userId !== "string" || !userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 422 });
  }

  const target = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, role: true, isActive: true, emailVerifiedAt: true },
  });

  if (!target) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  if (target.role === "ADMIN") {
    return NextResponse.json({ error: "Cannot impersonate an admin" }, { status: 422 });
  }
  if (!target.isActive) {
    return NextResponse.json({ error: "This account is suspended" }, { status: 422 });
  }

  const token = await createSessionToken(target, { id: session.user.id, role: "ADMIN" });

  const res = NextResponse.json({ success: true, role: target.role });
  const cookie = sessionCookieOptions();
  res.cookies.set(cookie.name, token, cookie);
  return res;
}
