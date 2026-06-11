import { requireRole } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { Wallet } from "lucide-react";
import { WithdrawalActions } from "@/components/admin/withdrawal-actions";
import type { WithdrawalStatus } from "@prisma/client";

const naira = (amount: number) => `₦${amount.toLocaleString("en-NG")}`;

// ── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: WithdrawalStatus }) {
  const styles: Record<WithdrawalStatus, string> = {
    PENDING: "bg-muted text-muted-foreground border border-border",
    APPROVED: "bg-success/10 text-success border border-success/30",
    REJECTED: "bg-destructive/10 text-destructive border border-destructive/30",
  };
  const labels: Record<WithdrawalStatus, string> = {
    PENDING: "Pending",
    APPROVED: "Approved",
    REJECTED: "Rejected",
  };

  return (
    <span
      className={[
        "inline-flex items-center rounded-full px-2.5 py-0.5",
        "text-[11px] font-semibold leading-none",
        styles[status],
      ].join(" ")}
    >
      {labels[status]}
    </span>
  );
}

// ── Empty state ──────────────────────────────────────────────────────────────

function EmptyWithdrawals() {
  return (
    <div className="flex flex-col items-center gap-4 rounded-card border border-card-border bg-card px-6 py-10 text-center shadow-card">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
        <Wallet className="h-7 w-7 text-muted-foreground" aria-hidden />
      </div>
      <div className="space-y-1">
        <p className="text-[15px] font-semibold text-foreground">No withdrawal requests</p>
        <p className="text-[13px] text-muted-foreground">
          Lecturer withdrawal requests will show up here for review
        </p>
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function AdminWithdrawalsPage() {
  await requireRole("ADMIN");

  const withdrawals = await db.withdrawalRequest.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      amount: true,
      status: true,
      createdAt: true,
      reviewedAt: true,
      lecturer: {
        select: {
          user: { select: { name: true, email: true } },
        },
      },
    },
  });

  return (
    <div className="px-page pt-12 pb-6 space-y-section max-w-lg mx-auto">
      <header>
        <p className="text-[13px] font-medium text-muted-foreground">Apex · Admin</p>
        <h1 className="mt-0.5 text-title font-bold text-foreground">Withdrawal Requests</h1>
        <p className="mt-1 text-[13px] text-muted-foreground">
          Review lecturer withdrawal requests. Approved transfers are processed manually.
        </p>
      </header>

      {withdrawals.length === 0 ? (
        <EmptyWithdrawals />
      ) : (
        <div className="space-y-element">
          {withdrawals.map((w) => (
            <div
              key={w.id}
              className="space-y-3 rounded-card border border-card-border bg-card p-card shadow-card"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 space-y-1">
                  <p className="truncate text-[15px] font-semibold text-foreground">
                    {w.lecturer.user.name ?? "—"}
                  </p>
                  <p className="truncate text-[13px] text-muted-foreground">
                    {w.lecturer.user.email}
                  </p>
                  <p className="text-[12px] text-muted-foreground">
                    Requested{" "}
                    {w.createdAt.toLocaleDateString("en-NG", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                </div>
                <div className="flex-shrink-0 text-right">
                  <p className="text-[18px] font-bold text-foreground">
                    {naira(Number(w.amount))}
                  </p>
                  <div className="mt-1">
                    <StatusBadge status={w.status} />
                  </div>
                </div>
              </div>
              {w.status === "PENDING" && <WithdrawalActions id={w.id} />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
