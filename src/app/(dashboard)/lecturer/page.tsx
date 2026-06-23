import { requireRole } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { getLecturerProfile } from "@/lib/data/lecturer";
import Link from "next/link";
import { ChevronRight, Bell, Plus } from "lucide-react";
import { ApexSeal, VerifiedLecturerBadge } from "@/components/ui/verification-badge";
import { BalanceCard } from "@/components/lecturer/balance-card";
import { ActivitySection } from "@/components/lecturer/activity-section";
import type { ActivityItemData } from "@/components/lecturer/activity-section";
import { StatCards } from "@/components/lecturer/stat-cards";
import type { BookData, SalesSummaryData } from "@/components/lecturer/stat-cards";
import { LECTURER_SHARE_RATE } from "@/lib/constants";
import { roundCurrency } from "@/lib/utils/format";

// ── Types ─────────────────────────────────────────────────────────────────────

type ActivityType =
  | "uploaded"
  | "published"
  | "purchased"
  | "withdrawal_submitted"
  | "withdrawal_approved"
  | "withdrawal_rejected";

type PillVariant = "neutral" | "success" | "destructive" | "amount" | "primary";

type ActivityItem = {
  type: ActivityType;
  label: string;
  detail: string;
  date: Date;
  pill?: { text: string; variant: PillVariant };
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function LecturerPage() {
  const session = await requireRole("LECTURER");
  const name = session.user.name;

  const lecturerProfile = await getLecturerProfile(session.user.id);

  const isVerified = lecturerProfile?.verified ?? false;

  let publishedCount = 0;
  let draftCount = 0;
  let salesCount = 0;
  let availableBalance = 0;
  let activity: ActivityItem[] = [];
  let booksData: BookData[] = [];
  let salesSummary: SalesSummaryData = {
    totalSales: 0,
    totalRevenue: 0,
    bestPerformingBook: "—",
    avgRevenuePerSale: 0,
  };

  const bankDetails = {
    bankName: lecturerProfile?.bankName ?? null,
    bankAccountNumber: lecturerProfile?.bankAccountNumber ?? null,
    bankAccountName: lecturerProfile?.bankAccountName ?? null,
  };

  if (lecturerProfile) {
    const lecturerId = lecturerProfile.id;

    // db.$transaction([...]) instead of Promise.all: pins these 7 reads to a
    // single pooled connection instead of checking out 7 concurrently — this
    // page alone exceeded Neon's connection_limit=5 on a single visit.
    const [published, drafts, sales, revenueAgg, textbooks, purchases, withdrawals] =
      await db.$transaction([
        db.textbook.count({ where: { lecturerId, status: "PUBLISHED" } }),
        db.textbook.count({ where: { lecturerId, status: "DRAFT" } }),
        db.purchase.count({ where: { status: "COMPLETED", textbook: { lecturerId } } }),
        db.purchase.aggregate({
          _sum: { amount: true },
          where: { status: "COMPLETED", textbook: { lecturerId } },
        }),
        db.textbook.findMany({
          where: { lecturerId },
          orderBy: { createdAt: "desc" },
          take: 50,
          select: { id: true, title: true, price: true, status: true, createdAt: true, publishedAt: true },
        }),
        db.purchase.findMany({
          where: { status: "COMPLETED", textbook: { lecturerId } },
          orderBy: { paidAt: "desc" },
          take: 50,
          select: {
            amount: true,
            paidAt: true,
            createdAt: true,
            student: { select: { name: true } },
            textbook: { select: { id: true, title: true } },
          },
        }),
        db.withdrawalRequest.findMany({
          where: { lecturerId },
          select: { amount: true, status: true, createdAt: true, reviewedAt: true },
        }),
      ]);

    publishedCount = published;
    draftCount = drafts;
    salesCount = sales;

    const totalEarnings = roundCurrency(
      Number(revenueAgg._sum.amount ?? 0) * LECTURER_SHARE_RATE,
    );
    const reserved = roundCurrency(
      withdrawals
        .filter((w) => w.status !== "REJECTED" && w.status !== "FAILED")
        .reduce((sum, w) => sum + Number(w.amount), 0),
    );
    availableBalance = roundCurrency(Math.max(0, totalEarnings - reserved));

    // ── Build activity feed ──────────────────────────────────────────────────
    for (const book of textbooks) {
      activity.push({
        type: "uploaded",
        label: "Textbook uploaded",
        detail: `${book.title} saved as draft`,
        date: book.createdAt,
        pill: { text: "Draft", variant: "neutral" },
      });
      if (book.publishedAt) {
        activity.push({
          type: "published",
          label: "New textbook published",
          detail: `${book.title} is now live`,
          date: book.publishedAt,
          pill: { text: "Published", variant: "success" },
        });
      }
    }

    for (const purchase of purchases) {
      const lecturerAmount = roundCurrency(Number(purchase.amount) * LECTURER_SHARE_RATE);
      activity.push({
        type: "purchased",
        label: "New sale",
        detail: `${purchase.textbook.title} purchased`,
        date: purchase.paidAt ?? purchase.createdAt,
        pill: {
          text: `+₦${lecturerAmount.toLocaleString("en-NG")}`,
          variant: "amount",
        },
      });
    }

    for (const withdrawal of withdrawals) {
      const amountLabel = `₦${Number(withdrawal.amount).toLocaleString("en-NG")}`;

      activity.push({
        type: "withdrawal_submitted",
        label: "Withdrawal requested",
        detail: amountLabel,
        date: withdrawal.createdAt,
        pill: { text: "Pending", variant: "neutral" },
      });

      if (withdrawal.reviewedAt) {
        if (withdrawal.status === "APPROVED" || withdrawal.status === "PAID") {
          activity.push({
            type: "withdrawal_approved",
            label: "Withdrawal approved",
            detail: amountLabel,
            date: withdrawal.reviewedAt,
            pill: { text: "Approved", variant: "success" },
          });
        }
        if (withdrawal.status === "REJECTED") {
          activity.push({
            type: "withdrawal_rejected",
            label: "Withdrawal rejected",
            detail: amountLabel,
            date: withdrawal.reviewedAt,
            pill: { text: "Rejected", variant: "destructive" },
          });
        }
      }
    }

    // Sort descending by date — ActivitySection handles the display limit
    activity = activity.sort((a, b) => b.date.getTime() - a.date.getTime());

    // Per-book sales aggregation for the Published Books bottom sheet
    const bookSalesMap = new Map<string, { salesCount: number; revenue: number }>();
    for (const p of purchases) {
      const id = p.textbook.id;
      const cur = bookSalesMap.get(id) ?? { salesCount: 0, revenue: 0 };
      cur.salesCount++;
      cur.revenue = roundCurrency(cur.revenue + Number(p.amount) * LECTURER_SHARE_RATE);
      bookSalesMap.set(id, cur);
    }

    booksData = textbooks
      .filter((b) => b.status === "PUBLISHED")
      .map((book) => ({
        title: book.title,
        price: Number(book.price),
        salesCount: bookSalesMap.get(book.id)?.salesCount ?? 0,
        revenue: bookSalesMap.get(book.id)?.revenue ?? 0,
      }))
      .sort((a, b) => b.salesCount - a.salesCount);

    const grossRevenue = Number(revenueAgg._sum.amount ?? 0);
    salesSummary = {
      totalSales: salesCount,
      totalRevenue: grossRevenue,
      bestPerformingBook: booksData[0]?.title ?? "—",
      avgRevenuePerSale: salesCount > 0 ? roundCurrency(grossRevenue / salesCount) : 0,
    };
  }

  const greeting = getGreeting();
  const displayName = name ?? "Lecturer";

  // Serialize dates for the server→client boundary
  const activityData: ActivityItemData[] = activity.map((a) => ({
    ...a,
    date: a.date.toISOString(),
  }));

  return (
    <div className="px-page pb-14 max-w-lg mx-auto">

      {/* ── Section 1: Header ─────────────────────────────────────────────── */}
      <header className="flex items-start justify-between pt-14 pb-4">
        <div className="space-y-1.5">
          <p className="text-[13px] font-medium text-[#64748B]">{greeting},</p>

          {/* Row 1: Name + inline certification seal */}
          <div className="flex flex-wrap items-center gap-2">
            <h1
              className="font-bold text-[#0F172A] leading-none tracking-tight"
              style={{ fontSize: "clamp(26px, 7vw, 32px)" }}
            >
              {displayName}
            </h1>
            {isVerified && <ApexSeal size={20} />}
          </div>

          {/* Row 2: Verified Lecturer trust indicator */}
          {isVerified && <VerifiedLecturerBadge />}
        </div>

        {/* Notification bell */}
        <a
          href="#activity"
          className="mt-1 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-[#EAEAEA] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)] transition-all duration-150 active:scale-[0.95]"
          aria-label="Activity"
        >
          <Bell className="h-4 w-4 text-[#64748B]" />
        </a>
      </header>

      {/* ── Section 2: Balance Card (hero) ────────────────────────────────── */}
      <BalanceCard availableBalance={availableBalance} bankDetails={bankDetails} />

      {/* ── Section 3: Stats ──────────────────────────────────────────────── */}
      <section className="mt-8">
        <StatCards
          publishedCount={publishedCount}
          draftCount={draftCount}
          salesCount={salesCount}
          books={booksData}
          salesSummary={salesSummary}
        />
      </section>

      {/* ── Section 4: Upload CTA ─────────────────────────────────────────── */}
      <section className="mt-6">
        <Link
          href="/lecturer/books/new"
          className="flex items-center gap-4 rounded-[18px] border border-[#F0F0F0] bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-all duration-150 active:scale-[0.99]"
        >
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[12px] bg-[#07132A]">
            <Plus className="h-5 w-5 text-white" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-semibold text-[#0F172A]">
              Upload a new textbook
            </p>
            <p className="text-[12px] text-[#64748B] mt-0.5">
              Share your knowledge and reach more students
            </p>
          </div>
          <ChevronRight className="h-4 w-4 flex-shrink-0 text-[#94A3B8]" aria-hidden />
        </Link>
      </section>

      {/* ── Section 5: Recent Activity ────────────────────────────────────── */}
      <section className="mt-10" id="activity">
        <h2 className="mb-4 text-[18px] font-bold text-[#0F172A]">Recent Activity</h2>
        <ActivitySection activity={activityData} />
      </section>
    </div>
  );
}
