import Link from "next/link";
import { requireRole } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { routes } from "@/config/routes";
import {
  Users,
  GraduationCap,
  BookOpen,
  TrendingUp,
  ShoppingBag,
  Wallet,
} from "lucide-react";

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

// ── Quick link ───────────────────────────────────────────────────────────────

function QuickLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between rounded-card border border-card-border bg-card px-card py-4 shadow-card transition-all duration-150 active:scale-[0.98]"
    >
      <p className="text-[15px] font-semibold text-foreground">{label}</p>
      <span className="text-[13px] text-muted-foreground">→</span>
    </Link>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function AdminPage() {
  await requireRole("ADMIN");

  const [revenueAgg, totalStudents, totalLecturers, publishedTextbooks, booksSold, pendingWithdrawals] =
    await Promise.all([
      db.purchase.aggregate({ _sum: { amount: true }, where: { status: "COMPLETED" } }),
      db.user.count({ where: { role: "STUDENT" } }),
      db.user.count({ where: { role: "LECTURER" } }),
      db.textbook.count({ where: { status: "PUBLISHED" } }),
      db.purchase.count({ where: { status: "COMPLETED" } }),
      db.withdrawalRequest.count({ where: { status: "PENDING" } }),
    ]);

  const totalRevenue = Number(revenueAgg._sum.amount ?? 0);

  return (
    <div className="px-page pt-12 pb-6 space-y-section max-w-lg mx-auto">

      {/* ── Platform header ───────────────────────── */}
      <header>
        <p className="text-[13px] font-medium text-muted-foreground">
          Apex · Admin
        </p>
        <h1 className="mt-0.5 text-title font-bold text-foreground">
          Platform Overview
        </h1>
      </header>

      {/* ── Metrics 2×2 grid ──────────────────────── */}
      <section>
        <h2 className="mb-element text-[13px] font-medium uppercase tracking-wider text-muted-foreground">
          Metrics
        </h2>
        <div className="grid grid-cols-2 gap-element">
          <MetricCard label="Total Revenue" value={naira(totalRevenue)} icon={TrendingUp} />
          <MetricCard label="Total Students" value={totalStudents} icon={GraduationCap} />
          <MetricCard label="Total Lecturers" value={totalLecturers} icon={Users} />
          <MetricCard label="Published Textbooks" value={publishedTextbooks} icon={BookOpen} />
          <MetricCard label="Books Sold" value={booksSold} icon={ShoppingBag} />
          <MetricCard label="Pending Withdrawals" value={pendingWithdrawals} icon={Wallet} />
        </div>
      </section>

      {/* ── Quick links ───────────────────────────── */}
      <section>
        <h2 className="mb-element text-[13px] font-medium uppercase tracking-wider text-muted-foreground">
          Manage
        </h2>
        <div className="space-y-element">
          <QuickLink href={routes.admin.lecturers} label="Lecturers" />
          <QuickLink href={routes.admin.students} label="Students" />
          <QuickLink href={routes.admin.textbooks} label="Textbooks" />
          <QuickLink href={routes.admin.withdrawals} label="Withdrawals" />
          <QuickLink href={routes.admin.revenue} label="Platform Revenue" />
          <QuickLink href={routes.admin.profile} label="Profile" />
        </div>
      </section>
    </div>
  );
}
