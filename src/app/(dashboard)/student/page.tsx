import { requireRole } from "@/lib/auth/session";
import Link from "next/link";
import { BookOpen, BookMarked } from "lucide-react";

// ── Helpers ─────────────────────────────────────────────────────────────────

function firstName(name: string | null | undefined): string {
  if (!name) return "there";
  return name.split(" ")[0];
}

function initials(name: string | null | undefined): string {
  if (!name) return "?";
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

// ── Quick action card ────────────────────────────────────────────────────────

function ActionCard({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: React.ElementType;
  label: string;
}) {
  return (
    <Link
      href={href}
      className={[
        "flex flex-col gap-3 rounded-card border border-card-border bg-card p-card",
        "shadow-card transition-all duration-150 active:scale-[0.97]",
      ].join(" ")}
    >
      {/* Icon container */}
      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-muted">
        <Icon className="h-5 w-5 text-foreground" aria-hidden />
      </span>
      {/* Label */}
      <span className="text-[15px] font-semibold leading-tight text-foreground">
        {label}
      </span>
    </Link>
  );
}

// ── Empty state ──────────────────────────────────────────────────────────────

function EmptyActivity() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-card border border-card-border bg-card px-6 py-10 text-center shadow-card">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
        <BookOpen className="h-7 w-7 text-muted-foreground" aria-hidden />
      </div>
      <div className="space-y-1">
        <p className="text-[15px] font-semibold text-foreground">No books yet</p>
        <p className="text-[13px] text-muted-foreground">
          Browse available textbooks
        </p>
      </div>
      <Link
        href="/student/discover"
        className="mt-1 inline-flex h-10 items-center rounded-button bg-primary px-5 text-[13px] font-semibold text-primary-foreground transition-all duration-150 active:scale-[0.97]"
      >
        Discover books
      </Link>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function StudentPage() {
  const session = await requireRole("STUDENT");
  const name = session.user.name;

  return (
    <div className="px-page pt-12 pb-6 space-y-section max-w-lg mx-auto">

      {/* ── Greeting ──────────────────────────────── */}
      <header className="flex items-start justify-between">
        <div>
          <p className="text-[13px] font-medium text-muted-foreground">
            Welcome back,
          </p>
          <h1 className="mt-0.5 text-title font-bold text-foreground">
            {firstName(name)}
          </h1>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Welcome back to Apex
          </p>
        </div>

        {/* Avatar */}
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary">
          <span className="text-[13px] font-bold text-primary-foreground">
            {initials(name)}
          </span>
        </div>
      </header>

      {/* ── Quick actions ─────────────────────────── */}
      <section>
        <h2 className="mb-element text-[13px] font-medium uppercase tracking-wider text-muted-foreground">
          Quick Actions
        </h2>
        <div className="grid grid-cols-2 gap-element">
          <ActionCard
            href="/student/discover"
            icon={BookOpen}
            label="Discover Books"
          />
          <ActionCard
            href="/student/library"
            icon={BookMarked}
            label="My Library"
          />
        </div>
      </section>

      {/* ── Recent activity ───────────────────────── */}
      <section>
        <h2 className="mb-element text-[18px] font-bold text-foreground">
          Recent Activity
        </h2>
        <EmptyActivity />
      </section>
    </div>
  );
}
