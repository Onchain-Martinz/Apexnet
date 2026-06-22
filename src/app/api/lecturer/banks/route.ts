import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getBanks } from "@/lib/flutterwave";

// ── GET /api/lecturer/banks ──────────────────────────────────────────────────
// Returns the list of Flutterwave-supported Nigerian banks for the bank
// selector on the lecturer profile page.

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "LECTURER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const banks = await getBanks();
    return NextResponse.json({ banks });
  } catch {
    return NextResponse.json({ error: "Failed to load banks" }, { status: 502 });
  }
}
