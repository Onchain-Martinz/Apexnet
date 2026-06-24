import { timingSafeEqual } from "crypto";

// ── Flutterwave V3 client ─────────────────────────────────────────────────────
// Authentication: static Bearer key (FLW_SECRET_KEY = FLWSECK-xxx).
// Base URL: https://api.flutterwave.com/v3
//
// Payment checkout is handled client-side by the Flutterwave Inline SDK using
// NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY. This module covers server-side calls only:
// transaction verification, bank lookup, account resolution, and transfers.

const FLW_BASE_URL = "https://api.flutterwave.com/v3";

function authHeader(): string {
  const key = process.env.FLW_SECRET_KEY;
  if (!key) throw new Error("FLW_SECRET_KEY is not set");
  return `Bearer ${key}`;
}

// Reads the raw text body and logs status + content-type before parsing JSON.
async function readResponse(
  res: Response,
  label: string,
): Promise<Record<string, unknown>> {
  const raw = await res.text();
  console.log(`[flutterwave/${label}] Response`, {
    status: res.status,
    contentType: res.headers.get("content-type"),
    body: raw.slice(0, 500),
  });
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    throw new Error(
      `Flutterwave ${label} returned non-JSON (HTTP ${res.status}): ${raw.slice(0, 200)}`,
    );
  }
}

// ── Verify transaction by ID ──────────────────────────────────────────────────
// GET /v3/transactions/:id/verify

export interface VerifyTransactionResult {
  status: string; // "successful" | "failed" | "cancelled"
  txRef: string;
  transactionId: number;
  amountNaira: number;
  paymentType: string | null;
  chargedAt: string | null;
}

export async function verifyTransactionById(
  transactionId: number | string,
): Promise<VerifyTransactionResult> {
  const url = `${FLW_BASE_URL}/transactions/${encodeURIComponent(String(transactionId))}/verify`;

  console.log("[flutterwave/transactions] Verifying transaction by ID", { url, transactionId });

  const res = await fetch(url, {
    headers: { Authorization: authHeader() },
    cache: "no-store",
  });

  const json = await readResponse(res, "transactions/verify-id");

  if (!res.ok || json.status !== "success") {
    console.error("[flutterwave/transactions] Verification by ID failed", {
      transactionId,
      status: res.status,
      message: json.message,
    });
    throw new Error((json.message as string) ?? "Failed to verify Flutterwave transaction");
  }

  const data = json.data as Record<string, unknown>;
  console.log("[flutterwave/transactions] Transaction verified", {
    transactionId,
    txStatus: data.status,
  });

  return {
    status: data.status as string,
    txRef: data.tx_ref as string,
    transactionId: data.id as number,
    amountNaira: data.amount as number,
    paymentType: (data.payment_type as string) ?? null,
    chargedAt: (data.charged_at as string) ?? null,
  };
}

// ── Verify transaction by reference (fallback) ────────────────────────────────
// GET /v3/transactions?tx_ref=...

export async function verifyTransactionByRef(
  txRef: string,
): Promise<VerifyTransactionResult | null> {
  const url = `${FLW_BASE_URL}/transactions?tx_ref=${encodeURIComponent(txRef)}`;

  console.log("[flutterwave/transactions] Verifying transaction by ref", { url, txRef });

  const res = await fetch(url, {
    headers: { Authorization: authHeader() },
    cache: "no-store",
  });

  const json = await readResponse(res, "transactions/verify-ref");

  if (!res.ok || json.status !== "success") {
    console.error("[flutterwave/transactions] Verification by ref failed", {
      txRef,
      status: res.status,
      message: json.message,
    });
    throw new Error((json.message as string) ?? "Failed to query Flutterwave transactions");
  }

  const rows = json.data as Array<{
    id: number;
    tx_ref: string;
    status: string;
    amount: number;
    payment_type: string | null;
    created_at: string;
  }> | null;

  if (!rows?.length) {
    console.log("[flutterwave/transactions] No transactions found for ref", { txRef });
    return null;
  }

  const row = rows.find((r) => r.status === "successful") ?? rows[rows.length - 1];
  console.log("[flutterwave/transactions] Transaction found by ref", {
    txRef,
    txStatus: row.status,
  });

  return {
    status: row.status,
    txRef: row.tx_ref,
    transactionId: row.id,
    amountNaira: row.amount,
    paymentType: row.payment_type ?? null,
    chargedAt: row.created_at ?? null,
  };
}

// ── Webhook signature verification ───────────────────────────────────────────
// Static "verif-hash" header comparison.

export function verifyWebhookSignature(signature: string | null): boolean {
  const hash = process.env.FLUTTERWAVE_WEBHOOK_HASH;
  if (!hash || !signature) return false;
  if (hash.length !== signature.length) return false;
  return timingSafeEqual(Buffer.from(hash), Buffer.from(signature));
}

// ── List banks ────────────────────────────────────────────────────────────────
// GET /v3/banks/NG

export interface FlutterwaveBank {
  name: string;
  code: string;
}

export async function getBanks(): Promise<FlutterwaveBank[]> {
  const url = `${FLW_BASE_URL}/banks/NG`;

  console.log("[flutterwave/banks] Fetching Nigerian banks", { url });

  const res = await fetch(url, {
    headers: { Authorization: authHeader() },
    cache: "no-store",
  });

  const json = await readResponse(res, "banks");

  if (!res.ok || json.status !== "success") {
    throw new Error((json.message as string) ?? "Failed to fetch banks");
  }

  return (json.data as Array<{ name: string; code: string }>).map((bank) => ({
    name: bank.name,
    code: bank.code,
  }));
}

// ── Resolve account number ────────────────────────────────────────────────────
// POST /v3/accounts/resolve

export interface ResolveAccountResult {
  accountNumber: string;
  accountName: string;
}

export async function resolveAccountNumber(
  accountNumber: string,
  bankCode: string,
): Promise<ResolveAccountResult> {
  const url = `${FLW_BASE_URL}/accounts/resolve`;

  console.log("[flutterwave/accounts] Resolving account number", { url, bankCode });

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: authHeader(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      account_number: accountNumber,
      account_bank: bankCode,
    }),
    cache: "no-store",
  });

  const json = await readResponse(res, "accounts/resolve");

  if (!res.ok || json.status !== "success") {
    throw new Error((json.message as string) ?? "Failed to resolve account number");
  }

  const data = json.data as Record<string, unknown>;
  return {
    accountNumber: data.account_number as string,
    accountName: data.account_name as string,
  };
}

// ── Initiate transfer ─────────────────────────────────────────────────────────
// POST /v3/transfers

export interface InitiateTransferParams {
  amountNaira: number;
  accountNumber: string;
  bankCode: string;
  accountName: string;
  narration: string;
  reference: string;
}

export interface InitiateTransferResult {
  transferId: string;
  reference: string;
  status: string; // "NEW" | "PENDING" | "SUCCESSFUL" | "FAILED"
  amountNaira: number;
}

export async function initiateTransfer(
  params: InitiateTransferParams,
): Promise<InitiateTransferResult> {
  const url = `${FLW_BASE_URL}/transfers`;

  console.log("[flutterwave/transfers] Initiating transfer", {
    url,
    reference: params.reference,
    amountNaira: params.amountNaira,
    bankCode: params.bankCode,
  });

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: authHeader(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      account_number: params.accountNumber,
      account_bank: params.bankCode,
      amount: params.amountNaira,
      currency: "NGN",
      beneficiary_name: params.accountName,
      narration: params.narration,
      reference: params.reference,
    }),
    cache: "no-store",
  });

  const json = await readResponse(res, "transfers");

  if (!res.ok || json.status !== "success") {
    console.error("[flutterwave/transfers] Transfer initiation failed", {
      reference: params.reference,
      status: res.status,
      message: json.message,
    });
    throw new Error((json.message as string) ?? "Failed to initiate Flutterwave transfer");
  }

  const data = json.data as Record<string, unknown>;
  console.log("[flutterwave/transfers] Transfer initiated", {
    reference: params.reference,
    transferId: data.id,
    txStatus: data.status,
  });

  return {
    transferId: String(data.id),
    reference: data.reference as string,
    status: data.status as string,
    amountNaira: data.amount as number,
  };
}

// ── Available balance ────────────────────────────────────────────────────────
// GET /v3/balances/:currency

export interface FlutterwaveBalanceResult {
  currency: string;
  availableBalance: number;
  ledgerBalance: number | null;
}

function readNumericField(data: Record<string, unknown>, keys: string[]): number | null {
  for (const key of keys) {
    const value = data[key];
    if (typeof value === "number") return value;
    if (typeof value === "string") {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return null;
}

export async function getAvailableBalance(
  currency = "NGN",
): Promise<FlutterwaveBalanceResult> {
  const normalizedCurrency = currency.toUpperCase();
  const url = `${FLW_BASE_URL}/balances/${encodeURIComponent(normalizedCurrency)}`;

  console.log("[flutterwave/balances] Fetching available balance", {
    url,
    currency: normalizedCurrency,
  });

  const res = await fetch(url, {
    headers: { Authorization: authHeader() },
    cache: "no-store",
  });

  const json = await readResponse(res, "balances");

  if (!res.ok || json.status !== "success") {
    throw new Error((json.message as string) ?? "Failed to fetch Flutterwave balance");
  }

  const data = json.data as Record<string, unknown>;
  const availableBalance = readNumericField(data, [
    "available_balance",
    "availableBalance",
    "available",
    "balance",
  ]);

  if (availableBalance === null) {
    throw new Error("Flutterwave balance response did not include an available balance");
  }

  return {
    currency: (data.currency as string | undefined) ?? normalizedCurrency,
    availableBalance,
    ledgerBalance: readNumericField(data, ["ledger_balance", "ledgerBalance"]),
  };
}

// ── Verify transfer ───────────────────────────────────────────────────────────
// GET /v3/transfers/:id

export interface VerifyTransferResult {
  status: string;
  reference: string;
  transferId: string;
  amountNaira: number;
  narration: string | null;
}

export async function verifyTransfer(transferId: string): Promise<VerifyTransferResult> {
  const url = `${FLW_BASE_URL}/transfers/${encodeURIComponent(transferId)}`;

  console.log("[flutterwave/transfers] Verifying transfer", { url, transferId });

  const res = await fetch(url, {
    headers: { Authorization: authHeader() },
    cache: "no-store",
  });

  const json = await readResponse(res, "transfers/verify");

  if (!res.ok || json.status !== "success") {
    throw new Error((json.message as string) ?? "Failed to verify Flutterwave transfer");
  }

  const data = json.data as Record<string, unknown>;
  return {
    status: data.status as string,
    reference: data.reference as string,
    transferId: String(data.id),
    amountNaira: data.amount as number,
    narration: (data.narration as string) ?? null,
  };
}
