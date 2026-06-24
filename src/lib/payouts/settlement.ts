import { Prisma, type PrismaClient } from "@prisma/client";
import { LECTURER_SHARE_RATE, SETTLEMENT_WINDOW_HOURS } from "@/lib/constants";
import { roundCurrency } from "@/lib/utils/format";

type DbClient = PrismaClient | Prisma.TransactionClient;

interface PayoutBalanceRow {
  current_revenue: Prisma.Decimal;
  pending_revenue: Prisma.Decimal;
  settled_revenue: Prisma.Decimal;
  reserved: Prisma.Decimal;
  last_payout_date: Date | null;
}

export interface LecturerPayoutBalances {
  currentEarnings: number;
  pendingSettlement: number;
  availableNextPayout: number;
  requestedPayouts: number;
  settlementCutoff: Date;
  settlementWindowHours: number;
  lastPayoutDate: Date | null;
}

export function getSettlementCutoff(now = new Date()): Date {
  return new Date(now.getTime() - SETTLEMENT_WINDOW_HOURS * 60 * 60 * 1000);
}

export async function computeLecturerPayoutBalances(
  db: DbClient,
  lecturerId: string,
  options: { excludeRequestId?: string | null } = {},
): Promise<LecturerPayoutBalances> {
  const settlementCutoff = getSettlementCutoff();
  const excludeRequestId = options.excludeRequestId ?? null;

  const rows = await db.$queryRaw<PayoutBalanceRow[]>`
    SELECT
      (SELECT COALESCE(SUM(p.amount), 0)
         FROM purchases p
         JOIN textbooks t ON t.id = p."textbookId"
        WHERE p.status = 'COMPLETED'
          AND t."lecturerId" = ${lecturerId}::uuid) AS current_revenue,
      (SELECT COALESCE(SUM(p.amount), 0)
         FROM purchases p
         JOIN textbooks t ON t.id = p."textbookId"
        WHERE p.status = 'COMPLETED'
          AND t."lecturerId" = ${lecturerId}::uuid
          AND COALESCE(p."paidAt", p."createdAt") > ${settlementCutoff}) AS pending_revenue,
      (SELECT COALESCE(SUM(p.amount), 0)
         FROM purchases p
         JOIN textbooks t ON t.id = p."textbookId"
        WHERE p.status = 'COMPLETED'
          AND t."lecturerId" = ${lecturerId}::uuid
          AND COALESCE(p."paidAt", p."createdAt") <= ${settlementCutoff}) AS settled_revenue,
      (SELECT COALESCE(SUM(amount), 0)
         FROM withdrawal_requests
        WHERE "lecturerId" = ${lecturerId}::uuid
          AND status NOT IN ('REJECTED', 'FAILED')
          AND (${excludeRequestId}::uuid IS NULL OR id <> ${excludeRequestId}::uuid)) AS reserved,
      (SELECT MAX("paidAt")
         FROM withdrawal_requests
        WHERE "lecturerId" = ${lecturerId}::uuid
          AND status = 'PAID') AS last_payout_date
  `;

  const row = rows[0];
  const currentEarnings = roundCurrency(Number(row.current_revenue) * LECTURER_SHARE_RATE);
  const pendingSettlement = roundCurrency(Number(row.pending_revenue) * LECTURER_SHARE_RATE);
  const settledEarnings = roundCurrency(Number(row.settled_revenue) * LECTURER_SHARE_RATE);
  const requestedPayouts = roundCurrency(Number(row.reserved));

  return {
    currentEarnings,
    pendingSettlement,
    availableNextPayout: roundCurrency(Math.max(0, settledEarnings - requestedPayouts)),
    requestedPayouts,
    settlementCutoff,
    settlementWindowHours: SETTLEMENT_WINDOW_HOURS,
    lastPayoutDate: row.last_payout_date,
  };
}
