import Link from "next/link";
import { GraduationCap } from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { routes } from "@/config/routes";
import { StudentActions } from "@/components/admin/student-actions";

// ── Empty state ──────────────────────────────────────────────────────────────

function EmptyStudents() {
  return (
    <div className="flex flex-col items-center gap-4 rounded-card border border-card-border bg-card px-6 py-10 text-center shadow-card">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
        <GraduationCap className="h-7 w-7 text-muted-foreground" aria-hidden />
      </div>
      <div className="space-y-1">
        <p className="text-[15px] font-semibold text-foreground">No students yet</p>
        <p className="text-[13px] text-muted-foreground">
          Students will appear here once they sign up
        </p>
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function AdminStudentsPage() {
  await requireRole("ADMIN");

  const students = await db.user.findMany({
    where: { role: "STUDENT" },
    take: 100,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      isActive: true,
      createdAt: true,
      _count: { select: { purchases: { where: { status: "COMPLETED" } } } },
      studentProfile: {
        select: {
          university: { select: { name: true } },
          department: { select: { name: true } },
        },
      },
    },
  });

  return (
    <div className="px-page pt-12 pb-6 space-y-section max-w-lg mx-auto">
      <header>
        <p className="text-[13px] font-medium text-muted-foreground">Apex · Admin</p>
        <h1 className="mt-0.5 text-title font-bold text-foreground">Students</h1>
      </header>

      {students.length === 0 ? (
        <EmptyStudents />
      ) : (
        <div className="space-y-element">
          {students.map((student) => {
            const meta = [student.studentProfile?.university?.name, student.studentProfile?.department?.name]
              .filter(Boolean)
              .join(" · ");

            return (
              <div
                key={student.id}
                className="space-y-3 rounded-card border border-card-border bg-card p-card shadow-card"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 space-y-0.5">
                    <p className="truncate text-[15px] font-semibold text-foreground">
                      {student.name ?? "—"}
                    </p>
                    <p className="truncate text-[13px] text-muted-foreground">{student.email}</p>
                    {meta && <p className="truncate text-[12px] text-muted-foreground">{meta}</p>}
                  </div>
                  {!student.isActive && (
                    <span className="flex-shrink-0 rounded-full border border-destructive/30 bg-destructive/10 px-2.5 py-0.5 text-[11px] font-semibold text-destructive">
                      Suspended
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 text-center">
                  <div>
                    <p className="text-[16px] font-bold text-foreground">{student._count.purchases}</p>
                    <p className="text-[11px] text-muted-foreground">Purchases</p>
                  </div>
                  <div>
                    <p className="text-[16px] font-bold text-foreground">
                      {student.createdAt.toLocaleDateString("en-NG", { year: "numeric", month: "short", day: "numeric" })}
                    </p>
                    <p className="text-[11px] text-muted-foreground">Joined</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={routes.admin.student(student.id)}
                    className="flex h-10 items-center justify-center rounded-button border border-border bg-background px-4 text-[13px] font-semibold text-foreground transition-all duration-150 active:scale-[0.97]"
                  >
                    View
                  </Link>
                  <StudentActions userId={student.id} isActive={student.isActive} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
