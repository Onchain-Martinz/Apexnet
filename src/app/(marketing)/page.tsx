import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Digital Textbooks for African Universities",
  description:
    "Apex gives students instant access to course textbooks — and lets lecturers earn from the knowledge they create.",
};

export default function HomePage() {
  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-background px-5 pt-safe pb-safe">

      {/* Subtle radial gradient — gives depth without clutter */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 flex items-center justify-center"
      >
        <div className="h-[600px] w-[600px] rounded-full bg-primary/5 blur-3xl" />
      </div>

      <div className="relative z-10 flex w-full max-w-sm flex-col items-center text-center">

        {/* Wordmark */}
        <div className="mb-12 flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary shadow-md">
            <svg
              viewBox="0 0 20 20"
              fill="none"
              className="h-5 w-5 text-white"
              aria-hidden
            >
              <path d="M10 2L17.3 15H2.7L10 2Z" fill="currentColor" />
            </svg>
          </div>
          <span className="text-xl font-semibold tracking-tight text-foreground">
            Apex
          </span>
        </div>

        {/* Headline */}
        <h1 className="text-[2rem] font-bold leading-[1.15] tracking-tight text-foreground">
          Digital Textbooks
          <br />
          <span className="text-primary">for African</span>
          <br />
          Universities
        </h1>

        {/* Subheadline */}
        <p className="mt-4 text-base text-muted-foreground leading-relaxed">
          Every course. Every campus.
          <br />
          Right in your pocket.
        </p>

        {/* CTAs */}
        <div className="mt-10 flex w-full flex-col gap-3">
          <Link
            href="/signup"
            className="flex h-14 w-full items-center justify-center rounded-2xl bg-primary text-sm font-semibold text-white shadow-md transition-all duration-150 hover:bg-primary/90 active:scale-[0.98]"
          >
            Get started — it&apos;s free
          </Link>

          <Link
            href="/login"
            className="flex h-14 w-full items-center justify-center rounded-2xl border border-border bg-background text-sm font-semibold text-foreground transition-all duration-150 hover:bg-muted active:scale-[0.98]"
          >
            Sign in
          </Link>
        </div>

        {/* Social proof micro-copy */}
        <p className="mt-8 text-xs text-muted-foreground">
          Trusted by students at UNILAG, ABU, OAU, and more.
        </p>
      </div>
    </div>
  );
}
