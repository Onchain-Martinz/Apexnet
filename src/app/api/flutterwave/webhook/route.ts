import { NextRequest, NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/flutterwave";
import { completePurchaseByReference } from "@/lib/purchases/complete";
import { completeTransferByReference } from "@/lib/withdrawals/complete-transfer";
import { captureException } from "@/lib/monitoring";

// ── POST /api/flutterwave/webhook ────────────────────────────────────────────
// Receives Flutterwave payment and transfer events. Authenticates via the
// static "verif-hash" header (configured in Flutterwave dashboard →
// Settings → Webhooks), then routes to the appropriate handler:
//
//  - charge.completed (status === "successful"):
//      Re-verifies the transaction with Flutterwave before completing purchase.
//      Uses data.id (transaction ID) for a precise GET /v3/transactions/:id/verify.
//  - transfer.completed:
//      Marks WithdrawalRequest PROCESSING → PAID.
//  - transfer.failed:
//      Marks WithdrawalRequest PROCESSING → FAILED (also covers reversals —
//      Flutterwave has no separate reversed event).
//
// Idempotency (preserved from Paystack implementation):
//  - completePurchaseByReference uses a conditional updateMany(PENDING → COMPLETED)
//    guarded by purchase status — safe to call multiple times for the same event.
//  - completeTransferByReference uses a conditional updateMany(PROCESSING → PAID/FAILED)
//    guarded by withdrawal status — same guarantee.
//  - Returning 500 triggers Flutterwave's retry mechanism, which is safe
//    because both handlers are fully idempotent.
//
// Flutterwave event names differ from Paystack:
//  charge.success (Paystack)  → charge.completed  (Flutterwave)
//  transfer.success (Paystack) → transfer.completed (Flutterwave)
//  transfer.failed  (same)
//  transfer.reversed (Paystack) → no equivalent; covered by transfer.failed

// ── Payload types ────────────────────────────────────────────────────────────

interface FlwChargeData {
  id?: number;
  tx_ref?: string;
  status?: string; // lowercase: "successful" | "failed" | "cancelled"
}

interface FlwTransferData {
  reference?: string;
  status?: string; // uppercase: "SUCCESSFUL" | "FAILED" | "PENDING" | "NEW"
  complete_message?: string;
  narration?: string;
}

interface FlwWebhookPayload {
  event?: string;
  data?: FlwChargeData | FlwTransferData;
}

// ── Handler ──────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("verif-hash");

  if (!verifyWebhookSignature(signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: FlwWebhookPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  try {
    switch (payload.event) {
      case "charge.completed": {
        const data = payload.data as FlwChargeData;
        // Guard: only process confirmed successful charges. Flutterwave can
        // fire charge.completed for other terminal statuses (e.g. "failed",
        // "cancelled"). Checking data.status prevents marking failed
        // payments as complete.
        if (data?.tx_ref && data.status === "successful") {
          await completePurchaseByReference(data.tx_ref, data.id);
        }
        break;
      }

      case "transfer.completed": {
        const data = payload.data as FlwTransferData;
        if (data?.reference) {
          await completeTransferByReference(data.reference, "success");
        }
        break;
      }

      case "transfer.failed": {
        const data = payload.data as FlwTransferData;
        if (data?.reference) {
          const reason = data.complete_message ?? data.narration ?? null;
          await completeTransferByReference(data.reference, "failed", reason);
        }
        break;
      }

      default:
        // Return 200 for all other events so Flutterwave does not retry them.
        break;
    }
  } catch (error) {
    const chargeData = payload.data as FlwChargeData | undefined;
    const transferData = payload.data as FlwTransferData | undefined;
    const ref = chargeData?.tx_ref ?? transferData?.reference;

    console.error("[flutterwave/webhook] Processing error", {
      event: payload.event,
      ref,
    }, error);

    captureException(error, {
      paymentReference: ref,
      extra: { event: payload.event ?? "unknown" },
    });

    // Return 500 so Flutterwave retries — both completion handlers are
    // idempotent so retries are always safe.
    return NextResponse.json({ error: "Processing error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
