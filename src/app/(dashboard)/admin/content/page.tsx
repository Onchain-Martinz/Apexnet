import Link from "next/link";
import { BookOpen, Wallet } from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import { routes } from "@/config/routes";

export default async function AdminContentPage() {
  await requireRole("ADMIN");

  return (
    <div className="px-page pt-12 pb-6 space-y-section max-w-lg mx-auto">
      <header>
        <p className="text-[13px] font-medium text-muted-foreground">Apex · Admin</p>
        <h1 className="mt-0.5 text-title font-bold text-foreground">Content</h1>
      </header>

      <div className="space-y-element">
        <Link
          href={routes.admin.textbooks}
          className="flex items-center gap-4 rounded-card border border-card-border bg-card p-card shadow-card transition-all duration-150 active:scale-[0.98]"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-muted">
            <BookOpen className="h-5 w-5 text-foreground" aria-hidden />
          </span>
          <div>
            <p className="text-[15px] font-semibold text-foreground">Textbooks</p>
            <p className="text-[13px] text-muted-foreground">Manage published and hidden textbooks</p>
          </div>
        </Link>

        <Link
          href={routes.admin.withdrawals}
          className="flex items-center gap-4 rounded-card border border-card-border bg-card p-card shadow-card transition-all duration-150 active:scale-[0.98]"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-muted">
            <Wallet className="h-5 w-5 text-foreground" aria-hidden />
          </span>
          <div>
            <p className="text-[15px] font-semibold text-foreground">Withdrawals</p>
            <p className="text-[13px] text-muted-foreground">Review and process withdrawal requests</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
