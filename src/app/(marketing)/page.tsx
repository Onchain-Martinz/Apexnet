import Link from "next/link";
import type { Metadata } from "next";
import { BookOpen, Check, TrendingUp, Upload } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { TextbookCard } from "@/components/textbooks/textbook-card";
import { HeroMockup, LecturerMockup, StudentMockup } from "@/components/marketing/landing-mockups";
import { getHomepageData } from "@/lib/marketing/homepage-data";

export const metadata: Metadata = {
  title: "Apex — Digital Publishing for Academic Materials",
  description:
    "Apex lets lecturers publish textbooks and academic resources digitally, and gives students instant access to verified course materials.",
};

// ISR: re-render at most once per 24 hours, matching the cache TTL.
// All five DB queries are served from unstable_cache — the connection pool
// is hit only when this page revalidates, not on every request.
export const revalidate = 86400;

const buttonBase =
  "inline-flex h-14 items-center justify-center gap-2 rounded-button px-6 text-[15px] font-semibold transition-all duration-150 touch-target active:scale-[0.97]";
const primaryButton = cn(buttonBase, "bg-primary text-primary-foreground hover:bg-primary/90");
const outlineButton = cn(buttonBase, "border border-border bg-background text-foreground hover:bg-muted");
const invertedButton = cn(buttonBase, "bg-background text-foreground hover:bg-background/90");
const ghostOnDarkButton = cn(buttonBase, "border border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/10");

const LECTURER_BENEFITS = [
  "No printing costs",
  "No inventory management",
  "Secure payments",
  "Real-time sales tracking",
  "Direct payout requests",
];

const STUDENT_BENEFITS = [
  "Instant access after purchase",
  "Personal library",
  "Verified lecturer materials",
  "Mobile-friendly reading experience",
  "Organized learning resources",
];

export default async function HomePage() {
  const { publishedCount, lecturerCount, studentCount, purchaseCount, marketplaceTextbooks } =
    await getHomepageData();

  const stats = [
    { label: "Published Materials", value: publishedCount },
    { label: "Lecturers", value: lecturerCount },
    { label: "Students", value: studentCount },
    { label: "Purchases", value: purchaseCount },
  ];

  return (
    <div className="flex flex-col">
      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="px-5 pt-16 pb-16 sm:pt-24 sm:pb-24">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center text-center">
          <h1 className="max-w-3xl text-[2.25rem] font-bold leading-[1.1] tracking-tight text-foreground sm:text-[3.5rem]">
            Digital Publishing for Academic Materials
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            Publish textbooks, lecture notes, and academic resources. Reach students instantly and earn from every
            purchase.
          </p>

          <div className="mt-8 flex w-full max-w-md flex-col gap-3 sm:w-auto sm:flex-row">
            <Link href="/signup?role=LECTURER" className={primaryButton}>
              Start Publishing
            </Link>
            <Link href="/textbooks" className={outlineButton}>
              Browse Materials
            </Link>
          </div>

          <div className="mt-16 w-full">
            <HeroMockup />
          </div>
        </div>
      </section>

      {/* ── Platform Stats ────────────────────────────────────────────────── */}
      <section className="border-y border-border bg-background-subtle px-5 py-10">
        <div className="mx-auto grid w-full max-w-6xl grid-cols-2 gap-8 sm:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="flex flex-col items-center text-center">
              <p className="text-[2rem] font-bold tracking-tight text-foreground sm:text-[2.5rem]">
                {stat.value.toLocaleString("en-NG")}
              </p>
              <p className="mt-1 text-[13px] text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How It Works ──────────────────────────────────────────────────── */}
      <section className="px-5 py-16 sm:py-24">
        <div className="mx-auto w-full max-w-6xl">
          <h2 className="text-center text-[1.75rem] font-bold tracking-tight text-foreground sm:text-[2.25rem]">
            How It Works
          </h2>

          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-card border border-card-border bg-card p-card shadow-card">
              <Upload className="h-6 w-6 text-foreground" aria-hidden />
              <h3 className="mt-4 text-[16px] font-semibold text-foreground">Publish</h3>
              <p className="mt-1.5 text-[14px] leading-relaxed text-muted-foreground">
                Upload textbooks, lecture notes, and academic resources.
              </p>
            </div>

            <div className="rounded-card border border-card-border bg-card p-card shadow-card">
              <BookOpen className="h-6 w-6 text-foreground" aria-hidden />
              <h3 className="mt-4 text-[16px] font-semibold text-foreground">Sell</h3>
              <p className="mt-1.5 text-[14px] leading-relaxed text-muted-foreground">
                Students purchase and access materials instantly.
              </p>
            </div>

            <div className="rounded-card border border-card-border bg-card p-card shadow-card">
              <TrendingUp className="h-6 w-6 text-foreground" aria-hidden />
              <h3 className="mt-4 text-[16px] font-semibold text-foreground">Earn</h3>
              <p className="mt-1.5 text-[14px] leading-relaxed text-muted-foreground">
                Track sales and receive payouts securely.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── For Lecturers ─────────────────────────────────────────────────── */}
      <section className="bg-background-subtle px-5 py-16 sm:py-24">
        <div className="mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <div>
            <h2 className="text-[1.75rem] font-bold leading-tight tracking-tight text-foreground sm:text-[2.25rem]">
              Publish Once. Reach More Students.
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground">
              Apex helps lecturers distribute academic materials digitally without printing, inventory management,
              or manual payment collection.
            </p>

            <ul className="mt-6 space-y-3">
              {LECTURER_BENEFITS.map((benefit) => (
                <li key={benefit} className="flex items-center gap-2.5 text-[15px] text-foreground">
                  <Check className="h-4 w-4 flex-shrink-0 text-foreground" aria-hidden />
                  {benefit}
                </li>
              ))}
            </ul>
          </div>

          <LecturerMockup />
        </div>
      </section>

      {/* ── For Students ──────────────────────────────────────────────────── */}
      <section className="px-5 py-16 sm:py-24">
        <div className="mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <div className="lg:order-2">
            <h2 className="text-[1.75rem] font-bold leading-tight tracking-tight text-foreground sm:text-[2.25rem]">
              Academic Materials, Anywhere.
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground">
              Access verified academic materials and build your personal learning library.
            </p>

            <ul className="mt-6 space-y-3">
              {STUDENT_BENEFITS.map((benefit) => (
                <li key={benefit} className="flex items-center gap-2.5 text-[15px] text-foreground">
                  <Check className="h-4 w-4 flex-shrink-0 text-foreground" aria-hidden />
                  {benefit}
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:order-1">
            <StudentMockup />
          </div>
        </div>
      </section>

      {/* ── Marketplace Preview ───────────────────────────────────────────── */}
      <section className="border-t border-border bg-background-subtle px-5 py-16 sm:py-24">
        <div className="mx-auto w-full max-w-6xl">
          <h2 className="text-center text-[1.75rem] font-bold tracking-tight text-foreground sm:text-[2.25rem]">
            From the Marketplace
          </h2>

          {marketplaceTextbooks.length > 0 ? (
            <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
              {marketplaceTextbooks.map((textbook) => (
                <TextbookCard key={textbook.id} textbook={textbook} />
              ))}
            </div>
          ) : (
            <div className="mt-10 flex flex-col items-center rounded-card border border-card-border bg-card p-card py-12 text-center shadow-card">
              <BookOpen className="h-8 w-8 text-muted-foreground" aria-hidden />
              <p className="mt-3 text-[15px] font-semibold text-foreground">No materials published yet</p>
              <p className="mt-1 text-[13px] text-muted-foreground">
                Check back soon — lecturers are publishing new materials regularly.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ── Final CTA ─────────────────────────────────────────────────────── */}
      <section className="bg-primary px-5 py-16 sm:py-24">
        <div className="mx-auto flex w-full max-w-3xl flex-col items-center text-center">
          <h2 className="text-[1.75rem] font-bold tracking-tight text-primary-foreground sm:text-[2.25rem]">
            Ready to Publish Your Academic Materials?
          </h2>
          <p className="mt-4 text-base leading-relaxed text-primary-foreground/70">
            Join Apex and start distributing your work digitally.
          </p>

          <div className="mt-8 flex w-full max-w-md flex-col gap-3 sm:w-auto sm:flex-row">
            <Link href="/signup?role=LECTURER" className={invertedButton}>
              Become a Lecturer
            </Link>
            <Link href="/textbooks" className={ghostOnDarkButton}>
              Browse Materials
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
