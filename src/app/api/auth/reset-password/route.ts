import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { resetPasswordSchema } from "@/lib/validations/auth";
import { checkRateLimit, getClientIp, rateLimitResponse, RATE_LIMITS } from "@/lib/rate-limit";
import { OTP_MAX_ATTEMPTS, verifyOtpHash } from "@/lib/auth/otp";

// ── POST /api/auth/reset-password ───────────────────────────────────────────
// Verifies a password reset OTP and sets a new password. Every failure mode
// (unknown email, missing/expired/exhausted/incorrect OTP) returns the same
// generic error to prevent email enumeration.

const GENERIC_ERROR = { error: "Invalid or expired code" };

export async function POST(req: NextRequest) {
  const ipRateLimit = checkRateLimit(`reset-password-ip:${getClientIp(req)}`, RATE_LIMITS.AUTH);
  if (!ipRateLimit.allowed) {
    return rateLimitResponse(ipRateLimit);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = resetPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 422 });
  }

  const normalizedEmail = parsed.data.email.toLowerCase().trim();

  const emailRateLimit = checkRateLimit(`reset-password:${normalizedEmail}`, RATE_LIMITS.RESET_PASSWORD);
  if (!emailRateLimit.allowed) {
    return rateLimitResponse(emailRateLimit);
  }

  const user = await db.user.findUnique({
    where: { email: normalizedEmail },
    select: { id: true, isActive: true },
  });

  if (!user || !user.isActive) {
    return NextResponse.json(GENERIC_ERROR, { status: 422 });
  }

  const otp = await db.passwordResetOtp.findUnique({
    where: { userId: user.id },
  });

  if (!otp) {
    return NextResponse.json(GENERIC_ERROR, { status: 422 });
  }

  if (otp.attempts >= OTP_MAX_ATTEMPTS) {
    return NextResponse.json(GENERIC_ERROR, { status: 422 });
  }

  if (otp.expiresAt < new Date()) {
    return NextResponse.json(GENERIC_ERROR, { status: 422 });
  }

  if (!verifyOtpHash(parsed.data.code, otp.codeHash)) {
    await db.passwordResetOtp.update({
      where: { userId: user.id },
      data: { attempts: otp.attempts + 1 },
    });
    return NextResponse.json(GENERIC_ERROR, { status: 422 });
  }

  const hashedPassword = await bcrypt.hash(parsed.data.newPassword, 12);

  await db.$transaction([
    db.user.update({
      where: { id: user.id },
      data: { hashedPassword },
    }),
    db.passwordResetOtp.delete({ where: { userId: user.id } }),
  ]);

  return NextResponse.json({ success: true });
}
