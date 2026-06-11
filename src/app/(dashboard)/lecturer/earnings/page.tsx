import { requireRole } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { Receipt } from "lucide-react";
import { EarningsHeader } from "@/components/lecturer/earnings-header";
import { TextbookSalesRow } from "@/components/lecturer/textbook-sales-row";
import type { WithdrawalStatus } from "@prisma/client";

// ── Metric card ──────────────────────────────────────────────────────────────

function MetricCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex flex-col gap-1 rounded-card border border-card-border bg-card p-card shadow-card">
      <p className="text-[22px] font-bold leading-none text-foreground">{value}</p>
      <p className="text-[13px] text-muted-foreground">{label}</p>
    </div>
  );
}

// ── Empty state ─────────────────────────────────────────────────────────────

function EmptyPurchases() {
  return (
    <div className="flex flex-col items-center gap-4 rounded-card border border-card-border bg-card px-6 py-10 text-center shadow-card">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
        <Receipt className="h-7 w-7 text-muted-foreground" aria-hidden />
      </div>
      <div className="space-y-1">
        <p className="text-[15px] font-semibold text-foreground">No purchases yet</p>
        <p className="text-[13px] text-muted-foreground">
          Student purchases will show up here once your books start selling
        </p>
      </div>
    </div>
  );
}

// ── Withdrawal status badge ─────────────────────────────────────────────────

function WithdrawalStatusBadge({ status }: { status: WithdrawalStatus }) {
  const styles: Record<WithdrawalStatus, string> = {
    PENDING:  "bg-muted text-muted-foreground border border-border",
    APPROVED: "bg-success/10 text-success border border-success/30",
    REJECTED: "bg-destructive/10 text-destructive border border-destructive/30",
  };
  const labels: Record<WithdrawalStatus, string> = {
    PENDING:  "Pending",
    APPROVED: "Approved",
    REJECTED: "Rejected",
  };

  return (
    <span
      className={[
        "inline-flex items-center rounded-full px-2.5 py-0.5",
        "text-[11px] font-semibold leading-none",
        styles[status],
      ].join(" ")}
    >
      {labels[status]}
    </span>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────

const naira = (amount: number) => `₦${amount.toLocaleString("en-NG")}`;

export default async function LecturerEarningsPage() {
  const session = await requireRole("LECTURER");

  const lecturerProfile = await db.lecturerProfile.findUnique({
    where: { userId: session.user.id },
    select: {
      id: true,
      bankName: true,
      bankAccountNumber: true,
      bankAccountName: true,
    },
  });

  const lecturerId = lecturerProfile?.id ?? null;

  const [textbooks, purchases, withdrawals] = lecturerId
    ? await Promise.all([
        db.textbook.findMany({
          where: { lecturerId },
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            title: true,
            price: true,
            status: true,
            purchases: {
              where: { status: "COMPLETED" },
              orderBy: { createdAt: "desc" },
              select: {
                id: true,
                amount: true,
                paidAt: true,
                createdAt: true,
                student: {
                  select: {
                    name: true,
                    studentProfile: { select: { university: { select: { name: true } } } },
                  },
                },
              },
            },
          },
        }),
        db.purchase.findMany({
          where: { status: "COMPLETED", textbook: { lecturerId } },
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            amount: true,
            paidAt: true,
            createdAt: true,
            student: { select: { name: true, email: true } },
            textbook: { select: { title: true } },
          },
        }),
        db.withdrawalRequest.findMany({
          where: { lecturerId },
          orderBy: { createdAt: "desc" },
          select: { id: true, amount: true, status: true, createdAt: true },
        }),
      ])
    : [[], [], []];

  // ── Derived totals ─────────────────────────────────────────────────────
  const textbookSales = textbooks.map((t) => ({
    id: t.id,
    title: t.title,
    price: Number(t.price),
    copiesSold: t.purchases.length,
    revenue: t.purchases.reduce((sum, p) => sum + Number(p.amount), 0),
    buyers: t.purchases.map((p) => ({
      id: p.id,
      name: p.student.name ?? "—",
      university: p.student.studentProfile?.university?.name ?? null,
      purchasedAt: p.paidAt ?? p.createdAt,
    })),
  }));

  const totalRevenue = textbookSales.reduce((sum, t) => sum + t.revenue, 0);
  const totalSales = textbookSales.reduce((sum, t) => sum + t.copiesSold, 0);
  const booksSoldCount = textbookSales.filter((t) => t.copiesSold > 0).length;
  const publishedCount = textbooks.filter((t) => t.status === "PUBLISHED").length;

  const reserved = withdrawals
    .filter((w) => w.status !== "REJECTED")
    .reduce((sum, w) => sum + Number(w.amount), 0);
  const availableBalance = Math.max(0, totalRevenue - reserved);

  return (
    <div className="px-page pt-12 pb-6 space-y-section max-w-lg mx-auto">
      <header>
        <h1 className="text-title font-bold text-foreground">Earnings</h1>
      </header>

      {/* ── Section A: Total Revenue ───────────────── */}
      <EarningsHeader
        totalRevenue={totalRevenue}
        availableBalance={availableBalance}
        bankDetails={{
          bankName: lecturerProfile?.bankName ?? null,
          bankAccountNumber: lecturerProfile?.bankAccountNumber ?? null,
          bankAccountName: lecturerProfile?.bankAccountName ?? null,
        }}
      />

      {/* ── Section A.1: Withdrawal history ─────────── */}
      {withdrawals.length > 0 && (
        <section className="space-y-element">
          <h2 className="text-[18px] font-bold text-foreground">Withdrawals</h2>
          <div className="space-y-element">
            {withdrawals.map((w) => (
              <div
                key={w.id}
                className="flex items-center justify-between gap-4 rounded-card border border-card-border bg-card p-card shadow-card"
              >
                <div className="space-y-1">
                  <p className="text-[15px] font-semibold text-foreground">
                    {naira(Number(w.amount))}
                  </p>
                  <p className="text-[12px] text-muted-foreground">
                    {w.createdAt.toLocaleDateString("en-NG", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                </div>
                <WithdrawalStatusBadge status={w.status} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Section B: Sales Summary ───────────────── */}
      <section>
        <h2 className="mb-element text-[13px] font-medium uppercase tracking-wider text-muted-foreground">
          Sales Summary
        </h2>
        <div className="grid grid-cols-3 gap-element">
          <MetricCard label="Total Sales" value={totalSales} />
          <MetricCard label="Books Sold" value={booksSoldCount} />
          <MetricCard label="Published" value={publishedCount} />
        </div>
      </section>

      {/* ── Section C: Textbook Sales ──────────────── */}
      <section>
        <h2 className="mb-element text-[18px] font-bold text-foreground">
          Textbook Sales
        </h2>
        {textbookSales.length === 0 ? (
          <p className="text-[13px] text-muted-foreground">
            Upload a textbook to start tracking sales.
          </p>
        ) : (
          <div className="space-y-element">
            {textbookSales.map((t) => (
              <TextbookSalesRow
                key={t.id}
                title={t.title}
                price={t.price}
                copiesSold={t.copiesSold}
                revenue={t.revenue}
                buyers={t.buyers}
              />
            ))}
          </div>
        )}
      </section>

      {/* ── Section D: Student Purchases ───────────── */}
      <section>
        <h2 className="mb-element text-[18px] font-bold text-foreground">
          Student Purchases
        </h2>
        {purchases.length === 0 ? (
          <EmptyPurchases />
        ) : (
          <div className="overflow-x-auto rounded-card border border-card-border bg-card shadow-card">
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="border-b border-card-border text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Student</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Textbook</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {purchases.map((p) => (
                  <tr key={p.id} className="border-b border-card-border last:border-0">
                    <td className="whitespace-nowrap px-4 py-3 text-foreground">
                      {p.student.name ?? "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                      {p.student.email}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-foreground">
                      {p.textbook.title}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                      {(p.paidAt ?? p.createdAt).toLocaleDateString("en-NG")}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-semibold text-foreground">
                      {naira(Number(p.amount))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
