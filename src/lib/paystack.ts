import { createHmac, timingSafeEqual } from "crypto";

// ── Paystack API client ──────────────────────────────────────────────────────
// Thin wrapper around the Paystack Transactions API.
// Docs: https://paystack.com/docs/api/transaction

const PAYSTACK_BASE_URL = "https://api.paystack.co";

function getSecretKey(): string {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) throw new Error("PAYSTACK_SECRET_KEY is not configured");
  return key;
}

// ── Initialize transaction ───────────────────────────────────────────────────

export interface InitializeTransactionParams {
  email: string;
  amountKobo: number;
  reference: string;
  callbackUrl: string;
  metadata?: Record<string, unknown>;
}

export interface InitializeTransactionResult {
  authorizationUrl: string;
  accessCode: string;
  reference: string;
}

export async function initializeTransaction(
  params: InitializeTransactionParams,
): Promise<InitializeTransactionResult> {
  const res = await fetch(`${PAYSTACK_BASE_URL}/transaction/initialize`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getSecretKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: params.email,
      amount: params.amountKobo,
      reference: params.reference,
      callback_url: params.callbackUrl,
      metadata: params.metadata,
    }),
  });

  const json = await res.json();
  if (!res.ok || !json.status) {
    throw new Error(json.message ?? "Failed to initialize Paystack transaction");
  }

  return {
    authorizationUrl: json.data.authorization_url,
    accessCode: json.data.access_code,
    reference: json.data.reference,
  };
}

// ── Verify transaction ───────────────────────────────────────────────────────

export interface VerifyTransactionResult {
  status: string; // "success" | "failed" | "abandoned" | ...
  reference: string;
  amountKobo: number;
  channel: string | null;
  paidAt: string | null;
}

export async function verifyTransaction(reference: string): Promise<VerifyTransactionResult> {
  const res = await fetch(
    `${PAYSTACK_BASE_URL}/transaction/verify/${encodeURIComponent(reference)}`,
    { headers: { Authorization: `Bearer ${getSecretKey()}` } },
  );

  const json = await res.json();
  if (!res.ok || !json.status) {
    throw new Error(json.message ?? "Failed to verify Paystack transaction");
  }

  return {
    status: json.data.status,
    reference: json.data.reference,
    amountKobo: json.data.amount,
    channel: json.data.channel ?? null,
    paidAt: json.data.paid_at ?? null,
  };
}

// ── Webhook signature verification ──────────────────────────────────────────
// Paystack signs webhook bodies with HMAC SHA512 of the raw request body,
// using the secret key. Compare against the `x-paystack-signature` header.

export function verifyWebhookSignature(rawBody: string, signature: string | null): boolean {
  if (!signature) return false;
  const hash = createHmac("sha512", getSecretKey()).update(rawBody).digest("hex");

  const hashBuffer = Buffer.from(hash, "hex");
  const signatureBuffer = Buffer.from(signature, "hex");

  if (hashBuffer.length !== signatureBuffer.length) return false;
  return timingSafeEqual(hashBuffer, signatureBuffer);
}

// ── Helpers ──────────────────────────────────────────────────────────────────

export function nairaToKobo(amount: number): number {
  return Math.round(amount * 100);
}
