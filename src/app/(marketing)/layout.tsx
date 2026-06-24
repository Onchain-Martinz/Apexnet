import Link from "next/link";
import { cn } from "@/lib/utils/cn";
import { routes } from "@/config/routes";

const NAVY = "#071330";

const navButton =
  "inline-flex h-10 items-center justify-center gap-2 rounded-button px-4 text-[13px] font-semibold transition-all duration-150 touch-target active:scale-[0.97]";

const FOOTER_LINKS = [
  { label: "Home", href: routes.home },
  { label: "Browse Books", href: "/textbooks" },
  { label: "Login", href: routes.login },
  { label: "Register", href: routes.signup },
  { label: "Support", href: "mailto:support@apexnet.site" },
  { label: "Privacy Policy", href: routes.privacy },
  { label: "Terms", href: routes.terms },
  { label: "Contact", href: "mailto:support@apexnet.site" },
];

// Marketing / landing layout — full-width, no constraints.
export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh flex flex-col bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 pt-safe backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-5">
          <Link href={routes.home} className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl" style={{ backgroundColor: NAVY }}>
              <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4 text-white" aria-hidden>
                <path d="M10 2L17.3 15H2.7L10 2Z" fill="currentColor" />
              </svg>
            </div>
            <span className="text-[17px] font-semibold tracking-tight text-foreground">Apex</span>
          </Link>

          <div className="flex items-center gap-2">
            <Link href={routes.login} className={cn(navButton, "text-foreground hover:bg-muted")}>
              Sign in
            </Link>
            <Link href={routes.signup} className={cn(navButton, "text-white hover:opacity-90")} style={{ backgroundColor: NAVY }}>
              Get started
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-border pb-safe">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-6 px-5 py-10 text-center sm:flex-row sm:justify-between sm:text-left">
          <p className="text-[13px] text-muted-foreground">
            © {new Date().getFullYear()} Apex. All rights reserved.
          </p>
          <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[13px] text-muted-foreground sm:justify-end">
            {FOOTER_LINKS.map((link) => (
              <Link key={link.label} href={link.href} className="transition-colors hover:text-foreground">
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </footer>
    </div>
  );
}
