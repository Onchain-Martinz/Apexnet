import { requireRole } from "@/lib/auth/session";
import { Users, GraduationCap, BookOpen, TrendingUp } from "lucide-react";

// ── Metric card ──────────────────────────────────────────────────────────────

function MetricCard({
  label,
  value,
  icon: Icon,
  prefix = "",
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  prefix?: string;
}) {
  return (
    <div className="flex flex-col justify-between gap-6 rounded-card border border-card-border bg-card p-card shadow-card">
      <div className="flex items-center justify-between">
        <p className="text-[13px] font-medium text-muted-foreground">{label}</p>
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
          <Icon className="h-4 w-4 text-muted-foreground" aria-hidden />
        </span>
      </div>
      <p className="text-[28px] font-bold leading-none text-foreground">
        {prefix}{value}
      </p>
    </div>
  );
}

// ── Section header ────────────────────────────────────────────────────────────

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="space-y-0.5">
      <h2 className="text-[18px] font-bold text-foreground">{title}</h2>
      {subtitle && (
        <p className="text-[13px] text-muted-foreground">{subtitle}</p>
      )}
    </div>
  );
}

// ── Empty activity ────────────────────────────────────────────────────────────

function EmptyActivity() {
  return (
    <div className="rounded-card border border-card-border bg-card px-5 py-8 shadow-card text-center">
      <p className="text-[15px] font-semibold text-foreground">No recent activity</p>
      <p className="mt-1 text-[13px] text-muted-foreground">
        Platform events will appear here
      </p>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function AdminPage() {
  await requireRole("ADMIN");

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
          <MetricCard label="Students"  value={0} icon={GraduationCap} />
          <MetricCard label="Lecturers" value={0} icon={Users} />
          <MetricCard label="Books"     value={0} icon={BookOpen} />
          <MetricCard label="Revenue"   value={0} icon={TrendingUp} prefix="₦" />
        </div>
      </section>

      {/* ── Recent activity ───────────────────────── */}
      <section>
        <div className="mb-element">
          <SectionHeader
            title="Recent Activity"
            subtitle="User registrations, book approvals, and payouts"
          />
        </div>
        <EmptyActivity />
      </section>
    </div>
  );
}
