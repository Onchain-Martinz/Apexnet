import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { verifyBankSchema } from "@/lib/validations/lecturer-profile";
import { getBanks, resolveAccountNumber } from "@/lib/flutterwave";
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from "@/lib/rate-limit";

// ── POST /api/lecturer/profile/verify-bank ──────────────────────────────────
// Verifies a lecturer's bank account against Flutterwave, then saves the
// verified details for use in future payout transfers.
//
// Unlike the Paystack flow, there is no transfer recipient to create or store
// here. Flutterwave accepts bank details directly on each transfer request,
// so verification simply resolves and persists the account name + details.
// The account name is always taken from Flutterwave's response, never the
// client. This does not initiate any transfer.

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "LECTURER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const rateLimit = checkRateLimit(`verify-bank:${session.user.id}`, RATE_LIMITS.VERIFY_BANK);
  if (!rateLimit.allowed) {
    return rateLimitResponse(rateLimit);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = verifyBankSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 422 });
  }

  const { bankCode, accountNumber } = parsed.data;

  const lecturerProfile = await db.lecturerProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });

  if (!lecturerProfile) {
    return NextResponse.json({ error: "Lecturer profile not found" }, { status: 404 });
  }

  // ── Confirm the bank code is supported ──────────────────────────────────
  const banks = await getBanks().catch(() => null);
  if (!banks) {
    return NextResponse.json({ error: "Failed to load bank list" }, { status: 502 });
  }

  const bank = banks.find((b) => b.code === bankCode);
  if (!bank) {
    return NextResponse.json({ error: "Selected bank is not supported" }, { status: 422 });
  }

  // ── Resolve account number against Flutterwave ───────────────────────────
  let resolved;
  try {
    resolved = await resolveAccountNumber(accountNumber, bankCode);
  } catch {
    return NextResponse.json(
      { error: "Could not verify account number. Check the details and try again." },
      { status: 422 },
    );
  }

  // ── Save verified details ───────────────────────────────────────────────
  // Bank details are stored and used directly in each Flutterwave transfer
  // request — no recipient code needed.
  const updated = await db.lecturerProfile.update({
    where: { id: lecturerProfile.id },
    data: {
      bankCode,
      bankName: bank.name,
      bankAccountNumber: accountNumber,
      bankAccountName: resolved.accountName,
      bankAccountVerifiedAt: new Date(),
    },
    select: {
      bankCode: true,
      bankName: true,
      bankAccountNumber: true,
      bankAccountName: true,
      bankAccountVerifiedAt: true,
    },
  });

  return NextResponse.json({ success: true, profile: updated });
}
