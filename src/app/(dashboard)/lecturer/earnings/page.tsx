import { requireRole } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { getLecturerProfile } from "@/lib/data/lecturer";
import { LECTURER_SHARE_RATE } from "@/lib/constants";
import { roundCurrency } from "@/lib/utils/format";
import { EarningsPageClient } from "@/components/lecturer/earnings-page-client";
import type { EarningsData } from "@/components/lecturer/earnings-page-client";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default async function LecturerEarningsPage() {
  const session = await requireRole("LECTURER");

  const lecturerProfile = await getLecturerProfile(session.user.id);

  const lecturerId = lecturerProfile?.id ?? null;

  const [textbooks, withdrawalRows] = lecturerId
    ? await Promise.all([
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
    : [[], []];

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
