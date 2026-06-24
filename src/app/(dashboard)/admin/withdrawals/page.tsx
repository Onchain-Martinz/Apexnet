import { requireRole } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { Wallet } from "lucide-react";
import { WithdrawalActions } from "@/components/admin/withdrawal-actions";
import { WithdrawalRetryButton } from "@/components/admin/withdrawal-retry-button";
import { MarkPaidButton } from "@/components/admin/mark-paid-button";
import type { WithdrawalStatus } from "@prisma/client";
import { computeLecturerPayoutBalances } from "@/lib/payouts/settlement";

const naira = (amount: number) => `₦${amount.toLocaleString("en-NG")}`;

// ── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: WithdrawalStatus }) {
  const styles: Record<WithdrawalStatus, string> = {
    PENDING: "bg-muted text-muted-foreground border border-border",
    APPROVED: "bg-success/10 text-success border border-success/30",
    PROCESSING: "bg-primary/10 text-primary border border-primary/30",
    PAID: "bg-success/10 text-success border border-success/30",
    FAILED: "bg-destructive/10 text-destructive border border-destructive/30",
    REJECTED: "bg-destructive/10 text-destructive border border-destructive/30",
  };
  const labels: Record<WithdrawalStatus, string> = {
    PENDING: "Pending",
    APPROVED: "Approved",
    PROCESSING: "Processing",
    PAID: "Paid",
    FAILED: "Failed",
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
        <p className="text-[15px] font-semibold text-foreground">No payout requests</p>
        <p className="text-[13px] text-muted-foreground">
          Lecturer payout queue requests will show up here for review
        </p>
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function AdminWithdrawalsPage() {
  await requireRole("ADMIN");

  const withdrawals = await db.withdrawalRequest.findMany({
    take: 200,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      lecturerId: true,
      amount: true,
      status: true,
      createdAt: true,
      reviewedAt: true,
      failureReason: true,
      retryCount: true,
      lecturer: {
        select: {
          user: { select: { name: true, email: true } },
          bankName: true,
          bankAccountNumber: true,
          bankAccountName: true,
          bankAccountVerifiedAt: true,
        },
      },
    },
  });

  // Each row's balance check is a single standalone query — there's nothing
  // else to pin it to, so no transaction wrapper is used here (the
  // interactive callback form previously used caused "transaction closed"
  // errors under load). See lecturer/page.tsx and lecturer/earnings/page.tsx
  // for the pattern used where there are multiple reads worth pinning.
  const queue = await Promise.all(
    withdrawals.map(async (w) => {
      const balances = await computeLecturerPayoutBalances(db, w.lecturerId, {
        excludeRequestId: w.id,
      });
      return {
        ...w,
        eligibleAmount: Math.min(Number(w.amount), balances.availableNextPayout),
        lastPayoutDate: balances.lastPayoutDate,
      };
    }),
  );

  return (
    <div className="px-page pt-12 pb-6 space-y-section max-w-lg mx-auto">
      <header>
        <p className="text-[13px] font-medium text-muted-foreground">Apex · Admin</p>
        <h1 className="mt-0.5 text-title font-bold text-foreground">Payout Queue</h1>
        <p className="mt-1 text-[13px] text-muted-foreground">
          Process lecturer payout requests using settled earnings only.
        </p>
      </header>

      {queue.length === 0 ? (
        <EmptyWithdrawals />
      ) : (
        <div className="space-y-element">
          {queue.map((w) => (
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
                  <p className="text-[12px] text-muted-foreground">
                    Last payout:{" "}
                    {w.lastPayoutDate
                      ? w.lastPayoutDate.toLocaleDateString("en-NG", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })
                      : "None"}
                  </p>
                </div>
                <div className="flex-shrink-0 text-right">
                  <p className="text-[18px] font-bold text-foreground">
                    {naira(w.eligibleAmount)}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    eligible of {naira(Number(w.amount))}
                  </p>
                  <div className="mt-1">
                    <StatusBadge status={w.status} />
                  </div>
                </div>
              </div>
              <div className="rounded-card border border-card-border bg-muted/30 p-3">
                <p className="text-[12px] font-medium text-muted-foreground">Bank Details</p>
                <p className="mt-1 text-[13px] font-semibold text-foreground">
                  {w.lecturer.bankAccountName ?? "No account name"}
                </p>
                <p className="text-[12px] text-muted-foreground">
                  {w.lecturer.bankName ?? "No bank"} · {w.lecturer.bankAccountNumber ?? "No account number"}
                </p>
                {!w.lecturer.bankAccountVerifiedAt && (
                  <p className="mt-1 text-[12px] text-destructive">Bank account is not verified.</p>
                )}
              </div>
              {w.status === "PENDING" && <WithdrawalActions id={w.id} />}
              {w.status === "APPROVED" && <MarkPaidButton id={w.id} />}
              {w.status === "FAILED" && (
                <div className="space-y-2">
                  {w.failureReason && (
                    <p className="text-[12px] text-destructive">
                      {w.failureReason}
                      {w.retryCount > 0 ? ` (attempt ${w.retryCount + 1})` : ""}
                    </p>
                  )}
                  <WithdrawalRetryButton id={w.id} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
