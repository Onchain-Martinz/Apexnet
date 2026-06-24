import { Prisma, type PrismaClient } from "@prisma/client";
import { computeLecturerPayoutBalances } from "@/lib/payouts/settlement";

type DbClient = PrismaClient | Prisma.TransactionClient;

// Backward-compatible wrapper for old call sites. During pilot this returns
// the settlement-aware amount available for the next scheduled payout.
export async function computeAvailableBalance(
  db: DbClient,
  lecturerId: string,
): Promise<number> {
  const balances = await computeLecturerPayoutBalances(db, lecturerId);
  return balances.availableNextPayout;
}
