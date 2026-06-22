import Link from "next/link";
import { Plus, Users } from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { routes } from "@/config/routes";
import { VerificationBadge } from "@/components/ui/verification-badge";
import { LecturerActions } from "@/components/admin/lecturer-actions";

const naira = (amount: number) => `₦${amount.toLocaleString("en-NG")}`;

// ── Empty state ──────────────────────────────────────────────────────────────

function EmptyLecturers() {
  return (
    <div className="flex flex-col items-center gap-4 rounded-card border border-card-border bg-card px-6 py-10 text-center shadow-card">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
        <Users className="h-7 w-7 text-muted-foreground" aria-hidden />
      </div>
      <div className="space-y-1">
        <p className="text-[15px] font-semibold text-foreground">No lecturers yet</p>
        <p className="text-[13px] text-muted-foreground">
          Create the first lecturer account to get started
        </p>
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function AdminLecturersPage() {
  await requireRole("ADMIN");

  const lecturers = await db.lecturerProfile.findMany({
    take: 100,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      verified: true,
      createdAt: true,
      user: { select: { id: true, name: true, email: true, isActive: true, createdAt: true } },
      textbooks: {
        select: {
          id: true,
          status: true,
          purchases: {
            where: { status: "COMPLETED" },
            select: { amount: true },
          },
        },
      },
    },
  });

  return (
    <div className="px-page pt-12 pb-6 space-y-section max-w-lg mx-auto">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-[13px] font-medium text-muted-foreground">Apex · Admin</p>
          <h1 className="mt-0.5 text-title font-bold text-foreground">Lecturers</h1>
        </div>
        <Link
          href={routes.admin.newLecturer}
          aria-label="Create lecturer"
          className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-primary transition-all duration-150 active:scale-[0.97]"
        >
          <Plus className="h-5 w-5 text-primary-foreground" aria-hidden />
        </Link>
      </header>

      {lecturers.length === 0 ? (
        <EmptyLecturers />
      ) : (
        <div className="space-y-element">
          {lecturers.map((lecturer) => {
            const publishedCount = lecturer.textbooks.filter((t) => t.status === "PUBLISHED").length;
            const revenue = lecturer.textbooks.reduce(
              (sum, t) => sum + t.purchases.reduce((s, p) => s + Number(p.amount), 0),
              0,
            );

            return (
              <div
                key={lecturer.id}
                className="space-y-3 rounded-card border border-card-border bg-card p-card shadow-card"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <p className="truncate text-[15px] font-semibold text-foreground">
                        {lecturer.user.name ?? "—"}
                      </p>
                      <VerificationBadge verified={lecturer.verified} />
                    </div>
                    <p className="truncate text-[13px] text-muted-foreground">{lecturer.user.email}</p>
                  </div>
                  {!lecturer.user.isActive && (
                    <span className="flex-shrink-0 rounded-full border border-destructive/30 bg-destructive/10 px-2.5 py-0.5 text-[11px] font-semibold text-destructive">
                      Suspended
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-[16px] font-bold text-foreground">{publishedCount}</p>
                    <p className="text-[11px] text-muted-foreground">Published</p>
                  </div>
                  <div>
                    <p className="text-[16px] font-bold text-foreground">{naira(revenue)}</p>
                    <p className="text-[11px] text-muted-foreground">Sales</p>
                  </div>
                  <div>
                    <p className="text-[16px] font-bold text-foreground">
                      {lecturer.user.createdAt.toLocaleDateString("en-NG", { year: "numeric", month: "short", day: "numeric" })}
                    </p>
                    <p className="text-[11px] text-muted-foreground">Joined</p>
                  </div>
                </div>

                <LecturerActions
                  lecturerProfileId={lecturer.id}
                  userId={lecturer.user.id}
                  verified={lecturer.verified}
                  isActive={lecturer.user.isActive}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
