import { BookOpen, CheckCircle2, TrendingUp, Wallet } from "lucide-react";

// Marketing-only visuals — static, illustrative, no live data. Built from the
// same card/button/progress patterns used throughout the dashboard, with the
// Apex accent blue (--primary) used for the brand-colored details.

// ── Hero mockup — a phone frame around a textbook detail screen ────────────

export function HeroMockup() {
  return (
    <div className="mx-auto w-[250px] sm:w-[270px]">
      <div className="relative rounded-[42px] bg-primary p-[10px] shadow-xl">
        {/* Speaker notch */}
        <div className="absolute left-1/2 top-3 z-10 h-1.5 w-14 -translate-x-1/2 rounded-full bg-white/15" />

        {/* Screen */}
        <div className="overflow-hidden rounded-[32px] bg-background">
          <div className="flex aspect-[9/19] flex-col px-4 pb-5 pt-9">
            {/* Status row */}
            <div className="flex items-center justify-between text-[10px] font-medium text-muted-foreground">
              <span>9:41</span>
              <span className="h-1.5 w-8 rounded-full bg-foreground/10" />
            </div>

            <p className="mt-5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Your Library
            </p>

            {/* Book card */}
            <div className="mt-3 flex-1 rounded-card border border-card-border bg-card p-card shadow-card">
              <div className="flex h-24 w-full items-center justify-center rounded-md bg-primary/10">
                <BookOpen className="h-7 w-7 text-primary" aria-hidden />
              </div>

              <p className="mt-3 text-[13px] font-semibold leading-tight text-foreground">
                Principles of Microeconomics
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">Dr. Adaeze Okonjo · Economics</p>

              <div className="mt-3 flex items-center justify-between">
                <p className="text-[14px] font-semibold text-foreground">₦4,500</p>
                <span className="flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-semibold text-success">
                  <CheckCircle2 className="h-3 w-3" aria-hidden />
                  Owned
                </span>
              </div>

              <div className="mt-3 flex h-10 items-center justify-center rounded-button bg-primary text-[13px] font-semibold text-primary-foreground">
                Continue Reading
              </div>

              <div className="mt-3 border-t border-border pt-3">
                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                  <span>Chapter 4 of 12</span>
                  <span>33%</span>
                </div>
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div className="h-full w-1/3 rounded-full bg-primary" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Lecturer mockup — earnings + sales row ──────────────────────────────────

export function LecturerMockup() {
  return (
    <div className="mx-auto w-full max-w-sm space-y-3">
      <div className="rounded-card border border-card-border bg-card p-card shadow-card">
        <div className="flex items-start justify-between gap-4">
          <p className="text-[13px] text-muted-foreground">Available next payout</p>
          <Wallet className="h-5 w-5 text-muted-foreground" aria-hidden />
        </div>
        <p className="mt-1 text-[28px] font-bold leading-tight text-foreground">₦182,400</p>
        <div className="mt-2 flex items-center gap-1.5 text-[12px] text-success">
          <TrendingUp className="h-3.5 w-3.5" aria-hidden />
          <span>12 sales this month</span>
        </div>
      </div>

      <div className="flex items-center gap-4 rounded-card border border-card-border bg-card p-card shadow-card">
        <div className="flex h-14 w-10 flex-shrink-0 items-center justify-center rounded-md bg-primary/10">
          <BookOpen className="h-5 w-5 text-primary" aria-hidden />
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

// ── Student mockup — personal library with reading progress ────────────────

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
          <div className="flex h-14 w-10 flex-shrink-0 items-center justify-center rounded-md bg-primary/10">
            <BookOpen className="h-5 w-5 text-primary" aria-hidden />
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
        <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-primary" aria-hidden />
        <span>Verified materials from your lecturers</span>
      </div>
    </div>
  );
}
