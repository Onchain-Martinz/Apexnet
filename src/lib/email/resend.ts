import { Resend } from "resend";

// ── Resend client ────────────────────────────────────────────────────────────

function getClient(): Resend {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY is not configured");
  return new Resend(key);
}

function getFromAddress(): string {
  const from = process.env.EMAIL_FROM;
  if (!from) throw new Error("EMAIL_FROM is not configured");
  return from;
}

// ── Send verification OTP email ─────────────────────────────────────────────

export async function sendVerificationOtpEmail(params: {
  to: string;
  name: string | null;
  code: string;
}): Promise<void> {
  const greeting = params.name ? `Hi ${params.name},` : "Hi,";

  const { error } = await getClient().emails.send({
    from: getFromAddress(),
    to: params.to,
    subject: `${params.code} is your Apex verification code`,
    text: `${greeting}\n\nYour Apex verification code is: ${params.code}\n\nThis code expires in 10 minutes. If you didn't request this, you can ignore this email.`,
    html: `<p>${greeting}</p><p>Your Apex verification code is:</p><p style="font-size:28px;font-weight:700;letter-spacing:4px;">${params.code}</p><p>This code expires in 10 minutes. If you didn't request this, you can ignore this email.</p>`,
  });

  if (error) {
    throw new Error(error.message ?? "Failed to send verification email");
  }
}

// ── Send password reset OTP email ───────────────────────────────────────────

export async function sendPasswordResetOtpEmail(params: {
  to: string;
  name: string | null;
  code: string;
}): Promise<void> {
  const greeting = params.name ? `Hi ${params.name},` : "Hi,";

  const { error } = await getClient().emails.send({
    from: getFromAddress(),
    to: params.to,
    subject: `${params.code} is your Apex password reset code`,
    text: `${greeting}\n\nWe received a request to reset your Apex password. Your reset code is: ${params.code}\n\nThis code expires in 10 minutes. If you didn't request this, you can safely ignore this email — your password will not be changed.`,
    html: `<p>${greeting}</p><p>We received a request to reset your Apex password. Your reset code is:</p><p style="font-size:28px;font-weight:700;letter-spacing:4px;">${params.code}</p><p>This code expires in 10 minutes. If you didn't request this, you can safely ignore this email — your password will not be changed.</p>`,
  });

  if (error) {
    throw new Error(error.message ?? "Failed to send password reset email");
  }
}
