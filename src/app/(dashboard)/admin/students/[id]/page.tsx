import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { routes } from "@/config/routes";
import { StudentActions } from "@/components/admin/student-actions";

const naira = (amount: number) => `₦${amount.toLocaleString("en-NG")}`;

export default async function AdminStudentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole("ADMIN");
  const { id } = await params;

  const student = await db.user.findUnique({
    where: { id, role: "STUDENT" },
    select: {
      id: true,
      name: true,
      email: true,
      isActive: true,
      createdAt: true,
      studentProfile: {
        select: {
          studentIdNumber: true,
          level: true,
          university: { select: { name: true } },
          department: { select: { name: true } },
        },
      },
      purchases: {
        where: { status: "COMPLETED" },
        orderBy: { paidAt: "desc" },
        select: {
          id: true,
          amount: true,
          paidAt: true,
          createdAt: true,
          textbook: { select: { title: true } },
        },
      },
    },
  });

  if (!student) {
    notFound();
  }

  return (
    <div className="px-page pt-12 pb-6 space-y-section max-w-lg mx-auto">
      <header className="flex items-center gap-3">
        <Link
          href={routes.admin.students}
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full hover:bg-muted transition-colors"
          aria-label="Back to students"
        >
          <ChevronLeft className="h-5 w-5 text-foreground" aria-hidden />
        </Link>
        <div className="min-w-0">
          <p className="text-[13px] font-medium text-muted-foreground">Apex · Admin</p>
          <h1 className="mt-0.5 truncate text-title font-bold text-foreground">{student.name ?? "—"}</h1>
        </div>
      </header>

      <section className="space-y-element rounded-card border border-card-border bg-card p-card shadow-card">
        <div>
          <p className="text-[13px] text-muted-foreground">Email</p>
          <p className="text-[15px] font-semibold text-foreground">{student.email}</p>
        </div>
        <div>
          <p className="text-[13px] text-muted-foreground">University</p>
          <p className="text-[15px] font-semibold text-foreground">
            {student.studentProfile?.university?.name ?? "—"}
          </p>
        </div>
        <div>
          <p className="text-[13px] text-muted-foreground">Department</p>
          <p className="text-[15px] font-semibold text-foreground">
            {student.studentProfile?.department?.name ?? "—"}
          </p>
        </div>
        <div>
          <p className="text-[13px] text-muted-foreground">Level</p>
          <p className="text-[15px] font-semibold text-foreground">
            {student.studentProfile?.level ?? "—"}
          </p>
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Identification
          </p>
          <p className="mt-1 text-[13px] text-muted-foreground">Matric / JAMB Number</p>
          <p className="text-[15px] font-semibold text-foreground">
            {student.studentProfile?.studentIdNumber ?? "—"}
          </p>
        </div>
        <div>
          <p className="text-[13px] text-muted-foreground">Joined</p>
          <p className="text-[15px] font-semibold text-foreground">
            {student.createdAt.toLocaleDateString("en-NG", { year: "numeric", month: "short", day: "numeric" })}
          </p>
        </div>
      </section>

      <section>
        <StudentActions userId={student.id} isActive={student.isActive} />
      </section>

      <section>
        <h2 className="mb-element text-[18px] font-bold text-foreground">
          Purchases ({student.purchases.length})
        </h2>
        {student.purchases.length === 0 ? (
          <div className="rounded-card border border-card-border bg-card px-5 py-8 text-center shadow-card">
            <p className="text-[13px] text-muted-foreground">No completed purchases yet</p>
          </div>
        ) : (
          <div className="space-y-element">
            {student.purchases.map((purchase) => (
              <div
                key={purchase.id}
                className="flex items-center justify-between gap-3 rounded-card border border-card-border bg-card p-card shadow-card"
              >
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-semibold text-foreground">{purchase.textbook.title}</p>
                  <p className="text-[12px] text-muted-foreground">
                    {(purchase.paidAt ?? purchase.createdAt).toLocaleDateString("en-NG", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                </div>
                <p className="flex-shrink-0 text-[14px] font-semibold text-foreground">
                  {naira(Number(purchase.amount))}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
