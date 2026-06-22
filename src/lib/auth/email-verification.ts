import { db } from "@/lib/db";
import { sendVerificationOtpEmail } from "@/lib/email/resend";
import { generateOtp, hashOtp, OTP_TTL_MS } from "@/lib/auth/otp";
import { captureException } from "@/lib/monitoring";

// ── Issue a fresh email verification OTP ────────────────────────────────────
// Generates a new code, upserts it onto the user's single OTP row (resetting
// attempts and resend cooldown), and emails it. Used by both registration and
// the resend endpoint. Email-send failures are logged but not thrown — the
// OTP is already persisted, so the user can always request another resend.

export async function issueEmailVerificationOtp(user: {
  id: string;
  email: string;
  name: string | null;
}): Promise<void> {
  const code = generateOtp();
  const now = new Date();

  await db.emailVerificationOtp.upsert({
    where: { userId: user.id },
    update: {
      codeHash: hashOtp(code),
      expiresAt: new Date(now.getTime() + OTP_TTL_MS),
      attempts: 0,
      lastSentAt: now,
    },
    create: {
      userId: user.id,
      codeHash: hashOtp(code),
      expiresAt: new Date(now.getTime() + OTP_TTL_MS),
      lastSentAt: now,
    },
  });

  try {
    await sendVerificationOtpEmail({ to: user.email, name: user.name, code });
  } catch (error) {
    console.error("[email-verification] Failed to send OTP email", error);
    captureException(error, { userId: user.id });
  }
}
