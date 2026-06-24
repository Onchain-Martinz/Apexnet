import { requireRole } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { PLATFORM_FEE_RATE } from "@/lib/constants";
import { roundCurrency } from "@/lib/utils/format";
import { TrendingUp, Landmark, Wallet, Clock, ShoppingBag } from "lucide-react";

const naira = (amount: number) => `₦${amount.toLocaleString("en-NG")}`;

// ── Metric card ──────────────────────────────────────────────────────────────

function MetricCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
}) {
  return (
    <div className="flex flex-col justify-between gap-6 rounded-card border border-card-border bg-card p-card shadow-card">
      <div className="flex items-center justify-between">
        <p className="text-[13px] font-medium text-muted-foreground">{label}</p>
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
          <Icon className="h-4 w-4 text-muted-foreground" aria-hidden />
        </span>
      </div>
      <p className="text-[28px] font-bold leading-none text-foreground">{value}</p>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function AdminRevenuePage() {
  await requireRole("ADMIN");

  // db.$transaction([...]) instead of Promise.all: pins these 4 reads to a
  // single pooled connection instead of checking out 4 concurrently.
  const [grossAgg, paidAgg, outstandingAgg, booksSold] = await db.$transaction([
    db.purchase.aggregate({ _sum: { amount: true }, where: { status: "COMPLETED" } }),
    db.withdrawalRequest.aggregate({ _sum: { amount: true }, where: { status: "PAID" } }),
    db.withdrawalRequest.aggregate({
      _sum: { amount: true },
      where: { status: { in: ["PENDING", "PROCESSING"] } },
    }),
    db.purchase.count({ where: { status: "COMPLETED" } }),
  ]);

  const platformVolume = roundCurrency(Number(grossAgg._sum.amount ?? 0));
  const platformRevenue = roundCurrency(platformVolume * PLATFORM_FEE_RATE);
  const totalPayouts = roundCurrency(Number(paidAgg._sum.amount ?? 0));
  const outstandingPayouts = roundCurrency(Number(outstandingAgg._sum.amount ?? 0));

  return (
    <div className="px-page pt-12 pb-6 space-y-section max-w-lg mx-auto">
      <header>
        <p className="text-[13px] font-medium text-muted-foreground">Apex · Admin</p>
        <h1 className="mt-0.5 text-title font-bold text-foreground">Platform Revenue</h1>
        <p className="mt-1 text-[13px] text-muted-foreground">
          Platform revenue is {PLATFORM_FEE_RATE * 100}% of platform volume from completed purchases.
        </p>
      </header>

      <section>
        <div className="grid grid-cols-2 gap-element">
          <MetricCard label="Platform Volume" value={naira(platformVolume)} icon={TrendingUp} />
          <MetricCard label="Total Platform Revenue" value={naira(platformRevenue)} icon={Landmark} />
          <MetricCard label="Total Payouts" value={naira(totalPayouts)} icon={Wallet} />
          <MetricCard label="Outstanding Payout Requests" value={naira(outstandingPayouts)} icon={Clock} />
          <MetricCard label="Books Sold" value={booksSold} icon={ShoppingBag} />
        </div>
      </section>
    </div>
  );
}
