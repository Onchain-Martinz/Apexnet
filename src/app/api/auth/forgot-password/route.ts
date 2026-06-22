import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { forgotPasswordSchema } from "@/lib/validations/auth";
import { checkRateLimit, getClientIp, rateLimitResponse, RATE_LIMITS } from "@/lib/rate-limit";
import { issuePasswordResetOtp } from "@/lib/auth/password-reset";

// ── POST /api/auth/forgot-password ──────────────────────────────────────────
// Issues a password reset OTP for the given email, if an active account
// exists. Always returns the same generic response to prevent email
// enumeration — the response shape and timing do not reveal whether the
// account exists.

const GENERIC_RESPONSE = {
  success: true,
  message: "If an account exists for this email, a reset code has been sent.",
};

export async function POST(req: NextRequest) {
  const ipRateLimit = checkRateLimit(`forgot-password-ip:${getClientIp(req)}`, RATE_LIMITS.AUTH);
  if (!ipRateLimit.allowed) {
    return rateLimitResponse(ipRateLimit);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = forgotPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 422 });
  }

  const normalizedEmail = parsed.data.email.toLowerCase().trim();

  const emailRateLimit = checkRateLimit(`forgot-password:${normalizedEmail}`, RATE_LIMITS.FORGOT_PASSWORD);
  if (!emailRateLimit.allowed) {
    return rateLimitResponse(emailRateLimit);
  }

  const user = await db.user.findUnique({
    where: { email: normalizedEmail },
    select: { id: true, email: true, name: true, isActive: true },
  });

  if (user?.isActive) {
    await issuePasswordResetOtp(user);
  }

  return NextResponse.json(GENERIC_RESPONSE);
}
