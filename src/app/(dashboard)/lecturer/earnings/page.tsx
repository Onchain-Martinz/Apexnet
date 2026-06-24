import { requireRole } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { getLecturerProfile } from "@/lib/data/lecturer";
import { LECTURER_SHARE_RATE, SETTLEMENT_WINDOW_HOURS } from "@/lib/constants";
import { roundCurrency } from "@/lib/utils/format";
import { EarningsPageClient } from "@/components/lecturer/earnings-page-client";
import type { EarningsData } from "@/components/lecturer/earnings-page-client";
import { computeLecturerPayoutBalances } from "@/lib/payouts/settlement";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default async function LecturerEarningsPage() {
  const session = await requireRole("LECTURER");

  const lecturerProfile = await getLecturerProfile(session.user.id);

  const lecturerId = lecturerProfile?.id ?? null;

  // db.$transaction([...]) — batch form, not the interactive callback form:
  // pins these 2 reads to a single pooled connection instead of checking out
  // 2 concurrently. computeLecturerPayoutBalances runs as its own standalone
  // query below, outside the transaction — see lecturer/page.tsx for the
  // same pattern (the interactive callback form caused "transaction closed"
  // errors here).
  const [textbooks, withdrawalRows] = lecturerId
    ? await db.$transaction([
        db.textbook.findMany({
          where: { lecturerId },
          select: {
            id: true,
            title: true,
            coverImageKey: true,
            purchases: {
              where: { status: "COMPLETED" },
              orderBy: [{ paidAt: "desc" }, { createdAt: "desc" }],
              take: 500,
              select: {
                amount: true,
                paidAt: true,
                createdAt: true,
                student: { select: { name: true } },
              },
            },
          },
        }),
        db.withdrawalRequest.findMany({
          where: { lecturerId },
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            amount: true,
            status: true,
            createdAt: true,
            transferReference: true,
          },
        }),
      ])
    : ([[], []] as const);

  const payoutBalances = lecturerId
    ? await computeLecturerPayoutBalances(db, lecturerId)
    : {
        currentEarnings: 0,
        pendingSettlement: 0,
        availableNextPayout: 0,
        requestedPayouts: 0,
        settlementCutoff: new Date(),
        settlementWindowHours: SETTLEMENT_WINDOW_HOURS,
        lastPayoutDate: null,
      };

  // ── Build flat purchase list, sorted by date desc ─────────────────────────

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  type FlatPurchase = {
    bookId: string;
    bookTitle: string;
    coverImageKey: string | null;
    studentName: string | null;
    amount: number;
    paidAt: string;
    date: Date;
  };

  const allPurchases: FlatPurchase[] = textbooks
    .flatMap((t) =>
      t.purchases.map((p) => ({
        bookId: t.id,
        bookTitle: t.title,
        coverImageKey: t.coverImageKey,
        studentName: p.student.name,
        amount: roundCurrency(Number(p.amount) * LECTURER_SHARE_RATE),
        paidAt: (p.paidAt ?? p.createdAt).toISOString(),
        date: p.paidAt ?? p.createdAt,
      })),
    )
    .sort((a, b) => b.date.getTime() - a.date.getTime());

  // ── Derived totals ────────────────────────────────────────────────────────

  const totalNetRevenue = roundCurrency(
    allPurchases.reduce((sum, p) => sum + p.amount, 0),
  );

  const currentMonthRevenue = roundCurrency(
    allPurchases
      .filter((p) => p.date >= monthStart)
      .reduce((sum, p) => sum + p.amount, 0),
  );

  // ── Typed output ──────────────────────────────────────────────────────────

  const earningsData: EarningsData = {
    totalNetRevenue,
    currentMonthRevenue,
    currentMonthName: MONTH_NAMES[now.getMonth()],
    pendingSettlement: payoutBalances.pendingSettlement,
    availableNextPayout: payoutBalances.availableNextPayout,
    lastPayoutDate: payoutBalances.lastPayoutDate?.toISOString() ?? null,
    studentPurchases: allPurchases.map(({ bookId, bookTitle, coverImageKey, studentName, amount, paidAt }) => ({
      bookId,
      bookTitle,
      coverImageKey,
      studentName,
      amount,
      paidAt,
    })),
    withdrawals: withdrawalRows.map((w) => ({
      id: w.id,
      amount: Number(w.amount),
      status: w.status,
      createdAt: w.createdAt.toISOString(),
      transferReference: w.transferReference,
    })),
  };

  return <EarningsPageClient data={earningsData} />;
}
