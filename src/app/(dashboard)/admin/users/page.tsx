import Link from "next/link";
import { GraduationCap, Users } from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import { routes } from "@/config/routes";

export default async function AdminUsersPage() {
  await requireRole("ADMIN");

  return (
    <div className="px-page pt-12 pb-6 space-y-section max-w-lg mx-auto">
      <header>
        <p className="text-[13px] font-medium text-muted-foreground">Apex · Admin</p>
        <h1 className="mt-0.5 text-title font-bold text-foreground">Users</h1>
      </header>

      <div className="space-y-element">
        <Link
          href={routes.admin.lecturers}
          className="flex items-center gap-4 rounded-card border border-card-border bg-card p-card shadow-card transition-all duration-150 active:scale-[0.98]"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-muted">
            <Users className="h-5 w-5 text-foreground" aria-hidden />
          </span>
          <div>
            <p className="text-[15px] font-semibold text-foreground">Lecturers</p>
            <p className="text-[13px] text-muted-foreground">Manage lecturer accounts and verification</p>
          </div>
        </Link>

        <Link
          href={routes.admin.students}
          className="flex items-center gap-4 rounded-card border border-card-border bg-card p-card shadow-card transition-all duration-150 active:scale-[0.98]"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-muted">
            <GraduationCap className="h-5 w-5 text-foreground" aria-hidden />
          </span>
          <div>
            <p className="text-[15px] font-semibold text-foreground">Students</p>
            <p className="text-[13px] text-muted-foreground">View students and manage account status</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
