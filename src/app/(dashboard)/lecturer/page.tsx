import { requireRole } from "@/lib/auth/session";
import { db } from "@/lib/db";
import Link from "next/link";
import { BookOpen, Plus, Upload, CheckCircle2, ShoppingBag, Wallet, XCircle } from "lucide-react";
import { VerificationBadge } from "@/components/ui/verification-badge";

const RECENT_ACTIVITY_LIMIT = 20;

type ActivityType =
  | "uploaded"
  | "published"
  | "purchased"
  | "withdrawal_submitted"
  | "withdrawal_approved"
  | "withdrawal_rejected";

type ActivityItem = {
  type: ActivityType;
  title: string;
  subtitle?: string;
  date: Date;
};

// ── Metric card ──────────────────────────────────────────────────────────────

function MetricCard({
  label,
  value,
  prefix = "",
}: {
  label: string;
  value: string | number;
  prefix?: string;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-card border border-card-border bg-card p-card shadow-card">
      <p className="text-[22px] font-bold leading-none text-foreground">
        {prefix}{value}
      </p>
      <p className="text-[13px] text-muted-foreground">{label}</p>
    </div>
  );
}

// ── Activity row ──────────────────────────────────────────────────────────────

const ACTIVITY_META: Record<
  ActivityType,
  { label: string; icon: React.ElementType; iconClass: string; bgClass: string }
> = {
  uploaded: {
    label: "Uploaded",
    icon: Upload,
    iconClass: "text-muted-foreground",
    bgClass: "bg-muted",
  },
  published: {
    label: "Published",
    icon: CheckCircle2,
    iconClass: "text-success",
    bgClass: "bg-success/10",
  },
  purchased: {
    label: "Purchased",
    icon: ShoppingBag,
    iconClass: "text-primary",
    bgClass: "bg-primary/10",
  },
  withdrawal_submitted: {
    label: "Withdrawal requested",
    icon: Wallet,
    iconClass: "text-muted-foreground",
    bgClass: "bg-muted",
  },
  withdrawal_approved: {
    label: "Withdrawal approved",
    icon: CheckCircle2,
    iconClass: "text-success",
    bgClass: "bg-success/10",
  },
  withdrawal_rejected: {
    label: "Withdrawal rejected",
    icon: XCircle,
    iconClass: "text-destructive",
    bgClass: "bg-destructive/10",
  },
};

function ActivityRow({ item }: { item: ActivityItem }) {
  const meta = ACTIVITY_META[item.type];
  const Icon = meta.icon;

  return (
    <div className="flex items-center gap-3 rounded-card border border-card-border bg-card p-card shadow-card">
      <div
        className={[
          "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full",
          meta.bgClass,
        ].join(" ")}
      >
        <Icon className={["h-5 w-5", meta.iconClass].join(" ")} aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-medium text-muted-foreground">
          {meta.label}
        </p>
        <p className="truncate text-[14px] font-semibold text-foreground">
          {item.title}
        </p>
        {item.subtitle && (
          <p className="truncate text-[12px] text-muted-foreground">{item.subtitle}</p>
        )}
      </div>
    </div>
  );
}

// ── Empty activity ────────────────────────────────────────────────────────────

function EmptyActivity({ cta }: { cta: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-card border border-card-border bg-card px-6 py-10 text-center shadow-card">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
        <BookOpen className="h-7 w-7 text-muted-foreground" aria-hidden />
      </div>
      <div className="space-y-1">
        <p className="text-[15px] font-semibold text-foreground">No activity yet</p>
        <p className="text-[13px] text-muted-foreground">
          Publish your first textbook to get started
        </p>
      </div>
      {cta}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function LecturerPage() {
  const session = await requireRole("LECTURER");
  const name = session.user.name;

  const lecturerProfile = await db.lecturerProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true, verified: true },
  });
  const isVerified = lecturerProfile?.verified ?? false;

  // ── Metrics — loading-safe defaults (0) when no lecturer profile exists ──
  let publishedCount = 0;
  let draftCount = 0;
  let salesCount = 0;
  let revenue = 0;
  let activity: ActivityItem[] = [];

  if (lecturerProfile) {
    const lecturerId = lecturerProfile.id;
    const [published, drafts, sales, revenueAgg, textbooks, purchases, withdrawals] = await Promise.all([
      db.textbook.count({ where: { lecturerId, status: "PUBLISHED" } }),
      db.textbook.count({ where: { lecturerId, status: "DRAFT" } }),
      db.purchase.count({ where: { status: "COMPLETED", textbook: { lecturerId } } }),
      db.purchase.aggregate({
        _sum: { amount: true },
        where: { status: "COMPLETED", textbook: { lecturerId } },
      }),
      db.textbook.findMany({
        where: { lecturerId },
        select: { title: true, createdAt: true, publishedAt: true },
      }),
      db.purchase.findMany({
        where: { status: "COMPLETED", textbook: { lecturerId } },
        select: {
          paidAt: true,
          createdAt: true,
          student: { select: { name: true } },
          textbook: { select: { title: true } },
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
    revenue = Number(revenueAgg._sum.amount ?? 0);

    for (const book of textbooks) {
      activity.push({ type: "uploaded", title: book.title, date: book.createdAt });
      if (book.publishedAt) {
        activity.push({ type: "published", title: book.title, date: book.publishedAt });
      }
    }

    for (const purchase of purchases) {
      activity.push({
        type: "purchased",
        title: purchase.textbook.title,
        subtitle: purchase.student.name ? `Bought by ${purchase.student.name}` : undefined,
        date: purchase.paidAt ?? purchase.createdAt,
      });
    }

    for (const withdrawal of withdrawals) {
      const amountLabel = `₦${Number(withdrawal.amount).toLocaleString("en-NG")}`;
      activity.push({
        type: "withdrawal_submitted",
        title: amountLabel,
        date: withdrawal.createdAt,
      });
      if (withdrawal.status === "APPROVED" && withdrawal.reviewedAt) {
        activity.push({
          type: "withdrawal_approved",
          title: amountLabel,
          date: withdrawal.reviewedAt,
        });
      }
      if (withdrawal.status === "REJECTED" && withdrawal.reviewedAt) {
        activity.push({
          type: "withdrawal_rejected",
          title: amountLabel,
          date: withdrawal.reviewedAt,
        });
      }
    }

    activity = activity
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, RECENT_ACTIVITY_LIMIT);
  }

  return (
    <div className="px-page pt-12 pb-6 space-y-section max-w-lg mx-auto">

      {/* ── Greeting ──────────────────────────────── */}
      <header className="space-y-0.5">
        <p className="text-[13px] font-medium text-muted-foreground">
          Welcome back,
        </p>
        <div className="flex items-center gap-2">
          <h1 className="text-title font-bold text-foreground">
            {name ?? "Lecturer"}
          </h1>
          {isVerified && <VerificationBadge />}
        </div>
      </header>

      {/* ── Metrics ───────────────────────────────── */}
      <section>
        <h2 className="mb-element text-[13px] font-medium uppercase tracking-wider text-muted-foreground">
          Overview
        </h2>
        <div className="grid grid-cols-2 gap-element">
          <MetricCard label="Published" value={publishedCount} />
          <MetricCard label="Drafts" value={draftCount} />
          <MetricCard label="Total Sales" value={salesCount} />
          <MetricCard label="Revenue" value={revenue.toLocaleString("en-NG")} prefix="₦" />
        </div>
      </section>

      {/* ── Upload CTA strip ──────────────────────── */}
      <Link
        href="/lecturer/books/new"
        className={[
          "flex items-center justify-between rounded-card border border-card-border",
          "bg-card px-card py-4 shadow-card",
          "transition-all duration-150 active:scale-[0.98]",
        ].join(" ")}
      >
        <div>
          <p className="text-[15px] font-semibold text-foreground">
            Upload a textbook
          </p>
          <p className="text-[13px] text-muted-foreground">
            Reach students across Africa
          </p>
        </div>
        <span className="flex h-9 w-9 items-center justify-center rounded-[12px] bg-primary">
          <Plus className="h-5 w-5 text-primary-foreground" aria-hidden />
        </span>
      </Link>

      {/* ── Recent activity ───────────────────────── */}
      <section>
        <h2 className="mb-element text-[18px] font-bold text-foreground">
          Recent Activity
        </h2>
        {activity.length > 0 ? (
          <div className="space-y-element">
            {activity.map((item, index) => (
              <ActivityRow key={`${item.type}-${item.title}-${index}`} item={item} />
            ))}
          </div>
        ) : (
          <EmptyActivity
            cta={
              <Link
                href="/lecturer/books/new"
                className="inline-flex h-10 items-center rounded-button bg-primary px-5 text-[13px] font-semibold text-primary-foreground transition-all duration-150 active:scale-[0.97]"
              >
                Upload textbook
              </Link>
            }
          />
        )}
      </section>
    </div>
  );
}
