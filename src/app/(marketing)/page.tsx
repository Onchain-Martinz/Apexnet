import Link from "next/link";
import type { Metadata } from "next";
import {
  BadgeCheck,
  Check,
  Cloud,
  CreditCard,
  Files,
  FileX2,
  Library,
  Lock,
  Search,
  ShieldCheck,
  Wallet,
  WalletCards,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { routes } from "@/config/routes";
import { HeroMockup, LecturerMockup, StudentMockup } from "@/components/marketing/landing-mockups";

const NAVY = "#071330";

export const metadata: Metadata = {
  title: "Apex — Your School Books, Finally Organized",
  description:
    "Buy lecturer-approved textbooks, access them instantly, and carry your academic library everywhere.",
};

// No DB calls on this page — fully static, so Next.js prerenders it at build time.

const buttonBase =
  "inline-flex h-14 items-center justify-center gap-2 rounded-button px-6 text-[15px] font-semibold transition-all duration-200 touch-target active:scale-[0.97]";
const primaryButton = cn(buttonBase, "text-white hover:opacity-90");
const outlineButton = cn(buttonBase, "border border-border bg-background text-foreground hover:bg-muted");
const invertedButton = cn(buttonBase, "bg-white hover:bg-white/90");
const ghostOnDarkButton = cn(buttonBase, "border border-white/25 text-white hover:bg-white/10");

const TRUST_INDICATORS = [
  "Instant access after payment",
  "Lecturer-approved content",
  "Secure payments powered by Flutterwave",
  "Built for Nigerian universities",
];

const PROBLEMS = [
  {
    icon: Files,
    title: "Scattered PDFs",
    description: "Students search WhatsApp groups, Telegram channels, and random websites for course materials.",
  },
  {
    icon: FileX2,
    title: "Lost Notes",
    description: "Files disappear when phones are lost or changed.",
  },
  {
    icon: WalletCards,
    title: "No Lecturer Revenue",
    description: "Lecturers create educational content but rarely earn from it digitally.",
  },
];

const SOLUTIONS = [
  {
    icon: Library,
    title: "Digital Library",
    description: "Every purchased textbook stays in one organized library.",
  },
  {
    icon: BadgeCheck,
    title: "Verified Lecturers",
    description: "Buy directly from approved lecturers.",
  },
  {
    icon: Zap,
    title: "Instant Access",
    description: "Purchase and start reading immediately.",
  },
];

const STEPS = [
  { icon: Search, title: "Find a textbook", description: "Search by course, lecturer, or department." },
  { icon: CreditCard, title: "Pay securely", description: "Checkout safely with Flutterwave." },
  { icon: Zap, title: "Read instantly", description: "Your textbook opens right in your library." },
];

const STUDENT_FEATURES = [
  { title: "Access books anywhere", description: "Open your library from any device, on or off campus." },
  { title: "Keep all textbooks in one place", description: "No more scattered files or forwarded links." },
  { title: "Fast search and discovery", description: "Find materials by course code or lecturer in seconds." },
  { title: "Secure purchases", description: "Every transaction is encrypted and protected." },
  { title: "Never lose access", description: "Your library stays with your account, not your phone." },
];

const LECTURER_FEATURES = [
  { title: "Upload textbooks", description: "Publish your materials in minutes." },
  { title: "Reach more students", description: "Get discovered across your university and beyond." },
  { title: "Track sales", description: "See exactly what's selling, in real time." },
  { title: "Weekly payouts", description: "Settled earnings are paid out every week." },
  { title: "Verified lecturer profiles", description: "Build trust with a verified academic profile." },
];

const TRUST_CARDS = [
  {
    icon: ShieldCheck,
    title: "Secure Flutterwave payments",
    description: "All transactions are processed through Flutterwave's secure infrastructure.",
  },
  {
    icon: BadgeCheck,
    title: "Verified lecturer accounts",
    description: "Every lecturer is verified before they can publish.",
  },
  {
    icon: Lock,
    title: "Protected digital access",
    description: "Textbooks are tied to your account, not shareable links.",
  },
  {
    icon: Cloud,
    title: "Reliable cloud storage",
    description: "Your library is safely stored and always available.",
  },
];

export default function HomePage() {
  return (
    <div className="flex flex-col">
      {/* ── Section 1: Hero ──────────────────────────────────────────────── */}
      <section className="px-5 pt-16 pb-16 sm:pt-24 sm:pb-20">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center text-center">
          <h1 className="max-w-2xl animate-slide-up text-[2.25rem] font-bold leading-[1.12] tracking-tight text-foreground sm:text-[3.25rem]">
            Your School Books. Finally Organized.
          </h1>
          <p className="mt-5 max-w-xl animate-slide-up text-base leading-relaxed text-muted-foreground sm:text-lg">
            Buy lecturer-approved textbooks, access them instantly, and carry your academic library everywhere.
          </p>

          <div className="mt-8 flex w-full max-w-md flex-col gap-3 sm:w-auto sm:flex-row">
            <Link href={routes.signup} className={primaryButton} style={{ backgroundColor: NAVY }}>
              Get Started
            </Link>
            <Link href="/textbooks" className={outlineButton}>
              Browse Textbooks
            </Link>
          </div>

          <ul className="mt-8 grid w-full max-w-2xl grid-cols-1 gap-2.5 sm:grid-cols-2">
            {TRUST_INDICATORS.map((item) => (
              <li
                key={item}
                className="flex items-center justify-center gap-2 text-[13px] text-muted-foreground sm:justify-start"
              >
                <Check className="h-4 w-4 flex-shrink-0" style={{ color: NAVY }} aria-hidden />
                {item}
              </li>
            ))}
          </ul>

          <div className="mt-16 w-full">
            <HeroMockup />
          </div>
        </div>
      </section>

      {/* ── Section 2: The Problem ───────────────────────────────────────── */}
      <section className="border-y border-border bg-background-subtle px-5 py-16 sm:py-24">
        <div className="mx-auto w-full max-w-6xl">
          <h2 className="text-center text-[1.75rem] font-bold tracking-tight text-foreground sm:text-[2.25rem]">
            The old way is broken.
          </h2>

          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {PROBLEMS.map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="rounded-card border border-card-border bg-card p-card shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm"
              >
                <Icon className="h-6 w-6 text-muted-foreground" aria-hidden />
                <h3 className="mt-4 text-[16px] font-semibold text-foreground">{title}</h3>
                <p className="mt-1.5 text-[14px] leading-relaxed text-muted-foreground">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Section 3: The Solution ───────────────────────────────────────── */}
      <section className="px-5 py-16 sm:py-24">
        <div className="mx-auto w-full max-w-6xl">
          <h2 className="text-center text-[1.75rem] font-bold tracking-tight text-foreground sm:text-[2.25rem]">
            One platform for students and lecturers.
          </h2>

          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {SOLUTIONS.map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="rounded-card border border-card-border bg-card p-card shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-[12px]" style={{ backgroundColor: `${NAVY}0F` }}>
                  <Icon className="h-5 w-5" style={{ color: NAVY }} aria-hidden />
                </div>
                <h3 className="mt-4 text-[16px] font-semibold text-foreground">{title}</h3>
                <p className="mt-1.5 text-[14px] leading-relaxed text-muted-foreground">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Section 4: How It Works ───────────────────────────────────────── */}
      <section className="border-t border-border bg-background-subtle px-5 py-16 sm:py-24">
        <div className="mx-auto w-full max-w-6xl">
          <h2 className="text-center text-[1.75rem] font-bold tracking-tight text-foreground sm:text-[2.25rem]">
            How it works.
          </h2>

          <div className="relative mt-12">
            <div className="absolute left-0 right-0 top-6 hidden h-px bg-border md:block" aria-hidden />
            <div className="grid grid-cols-1 gap-8 md:grid-cols-3 md:items-start md:gap-6">
              {STEPS.map((step, i) => (
                <div key={step.title} className="relative flex flex-col items-center text-center">
                  <div
                    className="relative z-10 flex h-12 w-12 items-center justify-center rounded-full text-[15px] font-semibold text-white shadow-sm"
                    style={{ backgroundColor: NAVY }}
                  >
                    {i + 1}
                  </div>
                  <h3 className="mt-4 text-[16px] font-semibold text-foreground">{step.title}</h3>
                  <p className="mt-1.5 max-w-[220px] text-[14px] leading-relaxed text-muted-foreground">
                    {step.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 5: For Students ───────────────────────────────────────── */}
      <section className="px-5 py-16 sm:py-24">
        <div className="mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <div className="lg:order-2">
            <h2 className="text-[1.75rem] font-bold leading-tight tracking-tight text-foreground sm:text-[2.25rem]">
              Built for students.
            </h2>

            <ul className="mt-6 space-y-4">
              {STUDENT_FEATURES.map((feature) => (
                <li key={feature.title} className="flex gap-3">
                  <Check className="mt-0.5 h-4 w-4 flex-shrink-0" style={{ color: NAVY }} aria-hidden />
                  <div>
                    <p className="text-[15px] font-semibold text-foreground">{feature.title}</p>
                    <p className="mt-0.5 text-[14px] leading-relaxed text-muted-foreground">{feature.description}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:order-1">
            <StudentMockup />
          </div>
        </div>
      </section>

      {/* ── Section 6: For Lecturers ──────────────────────────────────────── */}
      <section className="bg-background-subtle px-5 py-16 sm:py-24">
        <div className="mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <div>
            <h2 className="text-[1.75rem] font-bold leading-tight tracking-tight text-foreground sm:text-[2.25rem]">
              Turn your knowledge into digital income.
            </h2>

            <ul className="mt-6 space-y-4">
              {LECTURER_FEATURES.map((feature) => (
                <li key={feature.title} className="flex gap-3">
                  <Check className="mt-0.5 h-4 w-4 flex-shrink-0" style={{ color: NAVY }} aria-hidden />
                  <div>
                    <p className="text-[15px] font-semibold text-foreground">{feature.title}</p>
                    <p className="mt-0.5 text-[14px] leading-relaxed text-muted-foreground">{feature.description}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <LecturerMockup />
        </div>
      </section>

      {/* ── Section 7: Trust & Security ───────────────────────────────────── */}
      <section className="px-5 py-16 sm:py-24">
        <div className="mx-auto w-full max-w-6xl">
          <h2 className="text-center text-[1.75rem] font-bold tracking-tight text-foreground sm:text-[2.25rem]">
            Designed for confidence.
          </h2>

          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {TRUST_CARDS.map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="rounded-card border border-card-border bg-card p-card shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm"
              >
                <Icon className="h-6 w-6" style={{ color: NAVY }} aria-hidden />
                <h3 className="mt-4 text-[15px] font-semibold text-foreground">{title}</h3>
                <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Section 8: Early University Vision ───────────────────────────── */}
      <section className="border-t border-border px-5 py-16 sm:py-24">
        <div className="mx-auto flex w-full max-w-2xl flex-col items-center text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: `${NAVY}0F` }}>
            <Wallet className="h-5 w-5" style={{ color: NAVY }} aria-hidden />
          </div>
          <h2 className="mt-5 text-[1.75rem] font-bold tracking-tight text-foreground sm:text-[2.25rem]">
            The future of campus publishing.
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            Apex is building the infrastructure that helps universities move from scattered physical and PDF-based
            distribution into a modern digital publishing ecosystem.
          </p>
        </div>
      </section>

      {/* ── Section 9: Final CTA ──────────────────────────────────────────── */}
      <section className="px-5 py-16 sm:py-24" style={{ backgroundColor: NAVY }}>
        <div className="mx-auto flex w-full max-w-3xl flex-col items-center text-center">
          <h2 className="text-[1.75rem] font-bold tracking-tight text-white sm:text-[2.25rem]">
            Start building your academic library today.
          </h2>

          <div className="mt-8 flex w-full max-w-md flex-col gap-3 sm:w-auto sm:flex-row">
            <Link href={routes.signup} className={invertedButton} style={{ color: NAVY }}>
              Create Account
            </Link>
            <Link href="/textbooks" className={ghostOnDarkButton}>
              Browse Books
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
