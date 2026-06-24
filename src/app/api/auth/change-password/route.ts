import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { changePasswordSchema } from "@/lib/validations/auth";

// ── POST /api/auth/change-password ──────────────────────────────────────────
// Authenticated, in-session password change — no OTP. Used by the forced
// password-change modal for admin-created accounts (mustChangePassword),
// and is safe to reuse for any future voluntary in-session password change.
// Identity is already proven by the active session; this intentionally does
// not ask for the current password — see the onboarding-regression audit for
// why that's an acceptable trade-off for this specific flow.

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = changePasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 422 });
  }

  const hashedPassword = await bcrypt.hash(parsed.data.newPassword, 12);

  await db.user.update({
    where: { id: session.user.id },
    data: { hashedPassword, mustChangePassword: false },
  });

  return NextResponse.json({ success: true });
}
