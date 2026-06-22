import { BookOpen, CheckCircle2, TrendingUp, Wallet } from "lucide-react";

// ── Hero mockup — textbook cover, purchase action, reading progress ─────────
// Static visual composed from the same card/button/progress patterns used
// throughout the dashboard. No live data — purely illustrative.

export function HeroMockup() {
  return (
    <div className="mx-auto w-full max-w-sm rounded-card border border-card-border bg-card p-card shadow-card">
      <div className="flex gap-4">
        <div className="flex h-24 w-[72px] flex-shrink-0 items-center justify-center rounded-md bg-muted">
          <BookOpen className="h-6 w-6 text-muted-foreground" aria-hidden />
        </div>
        <div className="flex min-w-0 flex-1 flex-col justify-between py-0.5">
          <div>
            <p className="text-[14px] font-semibold leading-tight text-foreground">
              Principles of Microeconomics
            </p>
            <p className="mt-1 text-[12px] text-muted-foreground">Dr. Adaeze Okonjo</p>
            <p className="mt-1 text-[12px] text-muted-foreground">Economics · 200 Level</p>
          </div>
          <p className="text-[15px] font-semibold text-foreground">₦4,500</p>
        </div>
      </div>

      <div className="mt-4 flex h-12 items-center justify-center rounded-button bg-primary text-[15px] font-semibold text-primary-foreground">
        Buy now
      </div>

      <div className="mt-4 border-t border-border pt-4">
        <div className="flex items-center justify-between text-[12px] text-muted-foreground">
          <span>Reading progress</span>
          <span>Chapter 4 of 12</span>
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div className="h-full w-1/3 rounded-full bg-primary" />
        </div>
      </div>
    </div>
  );
}

// ── Lecturer mockup — earnings + sales row, matches dashboard styling ───────

export function LecturerMockup() {
  return (
    <div className="mx-auto w-full max-w-sm space-y-3">
      <div className="rounded-card border border-card-border bg-card p-card shadow-card">
        <div className="flex items-start justify-between gap-4">
          <p className="text-[13px] text-muted-foreground">Your Earnings</p>
          <Wallet className="h-5 w-5 text-muted-foreground" aria-hidden />
        </div>
        <p className="mt-1 text-[28px] font-bold leading-tight text-foreground">₦182,400</p>
        <div className="mt-2 flex items-center gap-1.5 text-[12px] text-success">
          <TrendingUp className="h-3.5 w-3.5" aria-hidden />
          <span>12 sales this month</span>
        </div>
      </div>

      <div className="flex items-center gap-4 rounded-card border border-card-border bg-card p-card shadow-card">
        <div className="flex h-14 w-10 flex-shrink-0 items-center justify-center rounded-md bg-muted">
          <BookOpen className="h-5 w-5 text-muted-foreground" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-semibold text-foreground">Organic Chemistry I</p>
          <p className="text-[12px] text-muted-foreground">34 copies sold</p>
        </div>
        <p className="text-[13px] font-semibold text-foreground">₦68,000</p>
      </div>
    </div>
  );
}

// ── Student mockup — personal library with reading progress ─────────────────

export function StudentMockup() {
  const items = [
    { title: "Principles of Microeconomics", meta: "Chapter 4 of 12", progress: "33%" },
    { title: "Organic Chemistry I", meta: "Chapter 9 of 15", progress: "60%" },
  ];

  return (
    <div className="mx-auto w-full max-w-sm space-y-3">
      {items.map((item) => (
        <div
          key={item.title}
          className="flex items-center gap-4 rounded-card border border-card-border bg-card p-card shadow-card"
        >
          <div className="flex h-14 w-10 flex-shrink-0 items-center justify-center rounded-md bg-muted">
            <BookOpen className="h-5 w-5 text-muted-foreground" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[14px] font-semibold text-foreground">{item.title}</p>
            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary" style={{ width: item.progress }} />
            </div>
            <p className="mt-1 text-[12px] text-muted-foreground">{item.meta}</p>
          </div>
        </div>
      ))}

      <div className="flex items-center gap-2 rounded-card border border-card-border bg-card p-card text-[12px] text-muted-foreground shadow-card">
        <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-foreground" aria-hidden />
        <span>Verified materials from your lecturers</span>
      </div>
    </div>
  );
}
