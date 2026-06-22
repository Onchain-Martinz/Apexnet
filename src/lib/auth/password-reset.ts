import { db } from "@/lib/db";
import { sendPasswordResetOtpEmail } from "@/lib/email/resend";
import { generateOtp, hashOtp, OTP_TTL_MS } from "@/lib/auth/otp";

// ── Issue a fresh password reset OTP ────────────────────────────────────────
// Generates a new code, upserts it onto the user's single reset-OTP row
// (resetting attempts and resend cooldown), and emails it. Email-send
// failures are logged but not thrown — the OTP is already persisted, so the
// user can always request another resend.

export async function issuePasswordResetOtp(user: {
  id: string;
  email: string;
  name: string | null;
}): Promise<void> {
  const code = generateOtp();
  const now = new Date();

  await db.passwordResetOtp.upsert({
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
    await sendPasswordResetOtpEmail({ to: user.email, name: user.name, code });
  } catch (error) {
    console.error("[password-reset] Failed to send OTP email", error);
  }
}
