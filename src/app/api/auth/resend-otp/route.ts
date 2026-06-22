import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from "@/lib/rate-limit";
import { issueEmailVerificationOtp } from "@/lib/auth/email-verification";
import { OTP_RESEND_COOLDOWN_MS } from "@/lib/auth/otp";

// ── POST /api/auth/resend-otp ───────────────────────────────────────────────
// Issues a fresh email verification code for the signed-in user, subject to a
// resend cooldown and a per-user rate limit.

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rateLimit = checkRateLimit(`resend-otp:${session.user.id}`, RATE_LIMITS.RESEND_OTP);
  if (!rateLimit.allowed) {
    return rateLimitResponse(rateLimit);
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, email: true, name: true, emailVerifiedAt: true },
  });

  if (!user) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  if (user.emailVerifiedAt) {
    return NextResponse.json({ success: true, alreadyVerified: true });
  }

  const existingOtp = await db.emailVerificationOtp.findUnique({
    where: { userId: user.id },
    select: { lastSentAt: true },
  });

  if (existingOtp) {
    const cooldownEnds = existingOtp.lastSentAt.getTime() + OTP_RESEND_COOLDOWN_MS;
    const now = Date.now();
    if (now < cooldownEnds) {
      return NextResponse.json(
        { error: "Please wait before requesting another code.", retryAfter: Math.ceil((cooldownEnds - now) / 1000) },
        { status: 429 },
      );
    }
  }

  await issueEmailVerificationOtp(user);

  return NextResponse.json({ success: true });
}
