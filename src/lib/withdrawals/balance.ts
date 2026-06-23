import { Prisma, type PrismaClient } from "@prisma/client";
import { LECTURER_SHARE_RATE } from "@/lib/constants";
import { roundCurrency } from "@/lib/utils/format";

type DbClient = PrismaClient | Prisma.TransactionClient;

interface BalanceRow {
  revenue: Prisma.Decimal;
  reserved: Prisma.Decimal;
}

// ── Available balance ───────────────────────────────────────────────────────
// totalRevenue: lecturer's share of all COMPLETED purchases for their textbooks.
// reserved: sum of withdrawal requests that are still in flight or paid out
// (PENDING, PROCESSING, APPROVED, PAID). REJECTED and FAILED withdrawals
// return their amount to the available balance.
// Shared by GET (read-only) and POST (outside the transaction — see Fix #2
// in withdrawals/route.ts).
//
// Single $queryRaw with two subqueries instead of purchase.aggregate() +
// withdrawalRequest.findMany() + JS .reduce(): under pgbouncer, every Prisma
// call costs 4 wire round trips (BEGIN/DEALLOCATE ALL/query/COMMIT), so the
// previous 2-call version cost 8. This costs 4 — same join conditions, same
// COMPLETED/REJECTED/FAILED filters, same rounding — just half the round
// trips. COALESCE replicates the previous `?? 0` null-when-no-rows handling.
export async function computeAvailableBalance(
  db: DbClient,
  lecturerId: string,
): Promise<number> {
  const rows = await db.$queryRaw<BalanceRow[]>`
    SELECT
      (SELECT COALESCE(SUM(p.amount), 0)
         FROM purchases p
         JOIN textbooks t ON t.id = p."textbookId"
        WHERE p.status = 'COMPLETED' AND t."lecturerId" = ${lecturerId}::uuid) AS revenue,
      (SELECT COALESCE(SUM(amount), 0)
         FROM withdrawal_requests
        WHERE "lecturerId" = ${lecturerId}::uuid AND status NOT IN ('REJECTED', 'FAILED')) AS reserved
  `;

  const row = rows[0];
  const totalRevenue = roundCurrency(Number(row.revenue) * LECTURER_SHARE_RATE);
  const reserved = roundCurrency(Number(row.reserved));

  return roundCurrency(Math.max(0, totalRevenue - reserved));
}
