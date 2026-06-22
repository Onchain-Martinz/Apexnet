"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Home,
  Compass,
  BookOpen,
  User,
  TrendingUp,
  Users,
  BarChart3,
  BookMarked,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

type NavItem = {
  href: string;
  label: string;
  icon: React.ElementType;
  /** Exact match only (for root/home links) */
  exact?: boolean;
};

// ── Nav definitions per role ───────────────────────────────────────────────

const STUDENT_NAV: NavItem[] = [
  { href: "/student",          label: "Home",     icon: Home,      exact: true },
  { href: "/student/discover", label: "D-Library", icon: Compass },
  { href: "/student/library",  label: "Library",  icon: BookMarked },
  { href: "/student/settings", label: "Profile",  icon: User },
];

const LECTURER_NAV: NavItem[] = [
  { href: "/lecturer",          label: "Home",     icon: Home,      exact: true },
  { href: "/lecturer/books",    label: "Books",    icon: BookOpen },
  { href: "/lecturer/earnings", label: "Earnings", icon: TrendingUp },
  { href: "/lecturer/profile",  label: "Profile",  icon: User },
];

const ADMIN_NAV: NavItem[] = [
  { href: "/admin",         label: "Home",    icon: Home,      exact: true },
  { href: "/admin/users",   label: "Users",   icon: Users },
  { href: "/admin/content", label: "Books",   icon: BookOpen },
  { href: "/admin/revenue", label: "Revenue", icon: BarChart3 },
];

const NAV_MAP: Record<string, NavItem[]> = {
  STUDENT:  STUDENT_NAV,
  LECTURER: LECTURER_NAV,
  ADMIN:    ADMIN_NAV,
};

// ── Component ──────────────────────────────────────────────────────────────

export function BottomNav() {
  const { data: session } = useSession();
  const pathname = usePathname();

  const role = session?.user?.role as string | undefined;
  const items = role ? NAV_MAP[role] : [];

  if (!items.length) return null;

  return (
    <nav
      aria-label="Main navigation"
      className={cn(
        "fixed bottom-0 inset-x-0 z-50",
        // No fixed height — outer nav grows to wrap inner bar + iOS safe area
        "bg-background border-t border-border",
        "pb-[env(safe-area-inset-bottom,0px)]",
      )}
    >
      {/* Inner bar: 72px exactly — content is vertically centred here */}
      <div className="flex h-nav items-center justify-around px-2">
        {items.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);

          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-1 items-center justify-center"
              aria-current={active ? "page" : undefined}
            >
              {/* Active: dark pill. Inactive: transparent. */}
              <span
                className={cn(
                  "flex flex-col items-center gap-1 rounded-nav px-4 py-2",
                  "transition-all duration-200",
                  active
                    ? "bg-primary"
                    : "bg-transparent",
                )}
              >
                <Icon
                  className={cn(
                    "h-5 w-5 transition-colors duration-200",
                    active ? "text-primary-foreground" : "text-muted-foreground",
                  )}
                  aria-hidden
                />
                <span
                  className={cn(
                    "text-[11px] font-medium leading-none transition-colors duration-200",
                    active ? "text-primary-foreground" : "text-muted-foreground",
                  )}
                >
                  {item.label}
                </span>
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
