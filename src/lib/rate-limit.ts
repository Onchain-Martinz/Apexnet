import { NextRequest, NextResponse } from "next/server";

// ── In-memory rate limiter ──────────────────────────────────────────────────
// Fixed-window counter keyed by an arbitrary string (IP, user id, email, ...).
// Suitable for a single-instance deployment. If Apex moves to multiple
// server instances, swap the `buckets` Map for a shared store (Upstash
// Redis, Postgres) behind this same `checkRateLimit` signature.

interface RateLimitConfig {
  limit: number;
  windowMs: number;
}

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

export function checkRateLimit(key: string, config: RateLimitConfig): RateLimitResult {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    const resetAt = now + config.windowMs;
    buckets.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: config.limit - 1, resetAt };
  }

  if (existing.count >= config.limit) {
    return { allowed: false, remaining: 0, resetAt: existing.resetAt };
  }

  existing.count += 1;
  return { allowed: true, remaining: config.limit - existing.count, resetAt: existing.resetAt };
}

// ── Shared limit presets ─────────────────────────────────────────────────────

export const RATE_LIMITS = {
  AUTH: { limit: 5, windowMs: 15 * 60 * 1000 },
  PURCHASE_INITIALIZE: { limit: 10, windowMs: 60 * 1000 },
  VERIFY_BANK: { limit: 3, windowMs: 60 * 1000 },
  ADMIN_BOOTSTRAP: { limit: 5, windowMs: 60 * 60 * 1000 },
  VERIFY_OTP: { limit: 5, windowMs: 15 * 60 * 1000 },
  RESEND_OTP: { limit: 3, windowMs: 10 * 60 * 1000 },
  FORGOT_PASSWORD: { limit: 3, windowMs: 10 * 60 * 1000 },
  RESET_PASSWORD: { limit: 5, windowMs: 15 * 60 * 1000 },
} as const satisfies Record<string, RateLimitConfig>;

// ── Helpers ──────────────────────────────────────────────────────────────────

// Best-effort client IP from standard proxy headers, falling back to a
// constant — acceptable for single-instance/local deployments.
export function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

export function rateLimitResponse(result: RateLimitResult): NextResponse {
  const res = NextResponse.json({ error: "Too many requests" }, { status: 429 });
  res.headers.set("Retry-After", Math.ceil((result.resetAt - Date.now()) / 1000).toString());
  return res;
}
