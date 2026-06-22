import { NextResponse } from "next/server";

// ── POST /api/paystack/webhook ──────────────────────────────────────────────
// Graceful no-op stub — Paystack has been replaced by Flutterwave.
// This route accepts all incoming Paystack webhook deliveries with a 200 OK
// so Paystack stops retrying events queued before the migration cutover.
// All new payment events are handled by /api/flutterwave/webhook.

export async function POST() {
  return NextResponse.json({ received: true });
}
