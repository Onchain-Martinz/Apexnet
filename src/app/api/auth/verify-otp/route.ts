import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from "@/lib/rate-limit";
import { OTP_MAX_ATTEMPTS, verifyOtpHash } from "@/lib/auth/otp";

// ── POST /api/auth/verify-otp ───────────────────────────────────────────────
// Verifies the 6-digit email verification code for the signed-in user.

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rateLimit = checkRateLimit(`verify-otp:${session.user.id}`, RATE_LIMITS.VERIFY_OTP);
  if (!rateLimit.allowed) {
    return rateLimitResponse(rateLimit);
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { emailVerifiedAt: true },
  });

  if (!user) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  if (user.emailVerifiedAt) {
    return NextResponse.json({ success: true, alreadyVerified: true });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const code = (body as { code?: unknown }).code;
  if (typeof code !== "string" || !/^\d{6}$/.test(code)) {
    return NextResponse.json({ error: "Enter the 6-digit code" }, { status: 422 });
  }

  const otp = await db.emailVerificationOtp.findUnique({
    where: { userId: session.user.id },
  });

  if (!otp) {
    return NextResponse.json(
      { error: "No verification code found. Please request a new one." },
      { status: 422 },
    );
  }

  if (otp.attempts >= OTP_MAX_ATTEMPTS) {
    return NextResponse.json(
      { error: "Too many attempts. Please request a new code." },
      { status: 422 },
    );
  }

  if (otp.expiresAt < new Date()) {
    return NextResponse.json(
      { error: "This code has expired. Please request a new one." },
      { status: 422 },
    );
  }

  if (!verifyOtpHash(code, otp.codeHash)) {
    await db.emailVerificationOtp.update({
      where: { userId: session.user.id },
      data: { attempts: otp.attempts + 1 },
    });
    return NextResponse.json({ error: "Incorrect code. Please try again." }, { status: 422 });
  }

  await db.$transaction([
    db.user.update({
      where: { id: session.user.id },
      data: { emailVerifiedAt: new Date() },
    }),
    db.emailVerificationOtp.delete({ where: { userId: session.user.id } }),
  ]);

  return NextResponse.json({ success: true });
}
