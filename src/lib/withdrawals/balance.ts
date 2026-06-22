import type { Prisma, PrismaClient } from "@prisma/client";
import { LECTURER_SHARE_RATE } from "@/lib/constants";
import { roundCurrency } from "@/lib/utils/format";

type DbClient = PrismaClient | Prisma.TransactionClient;

// ── Available balance ───────────────────────────────────────────────────────
// totalRevenue: lecturer's share of all COMPLETED purchases for their textbooks.
// reserved: sum of withdrawal requests that are still in flight or paid out
// (PENDING, PROCESSING, APPROVED, PAID). REJECTED and FAILED withdrawals
// return their amount to the available balance.
// Shared by GET (read-only) and POST (inside a serializable transaction).

export async function computeAvailableBalance(
  db: DbClient,
  lecturerId: string,
): Promise<number> {
  const [revenueAgg, withdrawals] = await Promise.all([
    db.purchase.aggregate({
      _sum: { amount: true },
      where: { status: "COMPLETED", textbook: { lecturerId } },
    }),
    db.withdrawalRequest.findMany({
      where: { lecturerId, status: { notIn: ["REJECTED", "FAILED"] } },
      select: { amount: true },
    }),
  ]);

  const totalRevenue = roundCurrency(Number(revenueAgg._sum.amount ?? 0) * LECTURER_SHARE_RATE);
  const reserved = roundCurrency(withdrawals.reduce((sum, w) => sum + Number(w.amount), 0));

  return roundCurrency(Math.max(0, totalRevenue - reserved));
}
