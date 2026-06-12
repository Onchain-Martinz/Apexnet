import { NextRequest, NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/paystack";
import { completePurchaseByReference } from "@/lib/purchases/complete";

// ── POST /api/paystack/webhook ──────────────────────────────────────────────
// Receives Paystack transaction events. Verifies the signature against the
// raw body, then re-verifies the transaction directly with Paystack before
// marking the purchase complete (see lib/purchases/complete).

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-paystack-signature");

  if (!verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: { event?: string; data?: { reference?: string } };
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const reference = payload.data?.reference;
  if (payload.event !== "charge.success" || !reference) {
    // Acknowledge unhandled events so Paystack doesn't retry them.
    return NextResponse.json({ received: true });
  }

  await completePurchaseByReference(reference);

  return NextResponse.json({ received: true });
}
