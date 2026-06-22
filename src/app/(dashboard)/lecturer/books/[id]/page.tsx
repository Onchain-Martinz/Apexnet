import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Receipt } from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { routes } from "@/config/routes";
import { LECTURER_SHARE_RATE } from "@/lib/constants";
import { roundCurrency } from "@/lib/utils/format";

const naira = (amount: number) => `₦${amount.toLocaleString("en-NG")}`;

// ── Empty state ─────────────────────────────────────────────────────────────

function EmptyBuyers() {
  return (
    <div className="flex flex-col items-center gap-4 rounded-card border border-card-border bg-card px-6 py-10 text-center shadow-card">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
        <Receipt className="h-7 w-7 text-muted-foreground" aria-hidden />
      </div>
      <div className="space-y-1">
        <p className="text-[15px] font-semibold text-foreground">No purchases yet</p>
        <p className="text-[13px] text-muted-foreground">
          Students who buy this textbook will show up here
        </p>
      </div>
    </div>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────

export default async function TextbookSalesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireRole("LECTURER");
  const { id } = await params;

  const lecturerProfile = await db.lecturerProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });

  if (!lecturerProfile) {
    notFound();
  }

  const textbook = await db.textbook.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      price: true,
      lecturerId: true,
      purchases: {
        where: { status: "COMPLETED" },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          amount: true,
          paidAt: true,
          createdAt: true,
          student: { select: { name: true, email: true } },
        },
      },
    },
  });

  if (!textbook || textbook.lecturerId !== lecturerProfile.id) {
    notFound();
  }

  const totalEarnings = roundCurrency(
    textbook.purchases.reduce((sum, p) => sum + Number(p.amount), 0) * LECTURER_SHARE_RATE,
  );

  return (
    <div className="px-page pt-12 pb-6 space-y-section max-w-lg mx-auto">
      <header className="flex items-center gap-3">
        <Link
          href={routes.lecturer.textbooks}
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full hover:bg-muted transition-colors"
          aria-label="Back to my books"
        >
          <ChevronLeft className="h-5 w-5 text-foreground" aria-hidden />
        </Link>
        <div className="min-w-0">
          <h1 className="truncate text-title font-bold text-foreground">{textbook.title}</h1>
          <p className="text-[13px] text-muted-foreground">Sales overview</p>
        </div>
      </header>

      {/* ── Earnings summary ─────────────────────────── */}
      <section className="grid grid-cols-2 gap-element">
        <div className="rounded-card border border-card-border bg-card p-card shadow-card">
          <p className="text-[22px] font-bold leading-none text-foreground">
            {naira(totalEarnings)}
          </p>
          <p className="mt-1 text-[13px] text-muted-foreground">Your Earnings</p>
        </div>
        <div className="rounded-card border border-card-border bg-card p-card shadow-card">
          <p className="text-[22px] font-bold leading-none text-foreground">
            {textbook.purchases.length}
          </p>
          <p className="mt-1 text-[13px] text-muted-foreground">Copies Sold</p>
        </div>
      </section>

      {/* ── Buyers ───────────────────────────────────── */}
      <section>
        <h2 className="mb-element text-[18px] font-bold text-foreground">
          Students
        </h2>
        {textbook.purchases.length === 0 ? (
          <EmptyBuyers />
        ) : (
          <div className="space-y-element">
            {textbook.purchases.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between gap-4 rounded-card border border-card-border bg-card p-card shadow-card"
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="truncate text-[15px] font-semibold text-foreground">
                    {p.student.name ?? "—"}
                  </p>
                  <p className="truncate text-[13px] text-muted-foreground">
                    {p.student.email}
                  </p>
                  <p className="text-[12px] text-muted-foreground">
                    Purchased {(p.paidAt ?? p.createdAt).toLocaleDateString("en-NG", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                </div>
                <p className="flex-shrink-0 text-[15px] font-semibold text-foreground">
                  {naira(roundCurrency(Number(p.amount) * LECTURER_SHARE_RATE))}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
