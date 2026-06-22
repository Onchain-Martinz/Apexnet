import { createHmac, randomInt, timingSafeEqual } from "crypto";

// ── Email verification OTP helpers ──────────────────────────────────────────
// 6-digit numeric codes, HMAC-SHA256 hashed before storage (never stored
// in plaintext). A short TTL + low entropy make bcrypt unnecessary here —
// HMAC with a server secret is fast and sufficient, paired with the
// attempt/rate limits enforced by the verify/resend routes.

export const OTP_LENGTH = 6;
export const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes
export const OTP_RESEND_COOLDOWN_MS = 60 * 1000; // 60 seconds
export const OTP_MAX_ATTEMPTS = 5;

function getOtpSecret(): string {
  const secret = process.env.OTP_HMAC_SECRET;
  if (!secret) throw new Error("OTP_HMAC_SECRET is not configured");
  return secret;
}

export function generateOtp(): string {
  return randomInt(0, 10 ** OTP_LENGTH).toString().padStart(OTP_LENGTH, "0");
}

export function hashOtp(code: string): string {
  return createHmac("sha256", getOtpSecret()).update(code).digest("hex");
}

export function verifyOtpHash(code: string, hash: string): boolean {
  const expected = Buffer.from(hashOtp(code), "hex");
  const actual = Buffer.from(hash, "hex");
  if (expected.length !== actual.length) return false;
  return timingSafeEqual(expected, actual);
}
