import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, Clock, XCircle } from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { routes } from "@/config/routes";
import { completePurchaseByReference } from "@/lib/purchases/complete";

// ── Purchase callback ────────────────────────────────────────────────────────
// Paystack redirects here after checkout. Re-verifies and completes the
// purchase (idempotent — the webhook may have already done this), then shows
// the result with a link into the textbook.

export default async function PurchaseCallbackPage({
  searchParams,
}: {
  searchParams: Promise<{ reference?: string }>;
}) {
  const session = await requireRole("STUDENT");
  const { reference } = await searchParams;

  if (!reference) {
    notFound();
  }

  const purchase = await db.purchase.findUnique({
    where: { paystackReference: reference },
    select: {
      studentId: true,
      textbook: { select: { id: true, title: true } },
    },
  });

  if (!purchase || purchase.studentId !== session.user.id) {
    notFound();
  }

  const result = await completePurchaseByReference(reference);
  const { textbook } = purchase;

  const success = result.status === "completed" || result.status === "already_completed";
  const pending = result.status === "pending";

  return (
    <div className="px-page pt-12 pb-6 space-y-section max-w-lg mx-auto">
      <div className="flex flex-col items-center gap-4 rounded-card border border-card-border bg-card px-6 py-12 text-center shadow-card">
        {success && (
          <>
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-success/10">
              <CheckCircle2 className="h-7 w-7 text-success" aria-hidden />
            </div>
            <div className="space-y-1">
              <p className="text-[15px] font-semibold text-foreground">Purchase successful</p>
              <p className="text-[13px] text-muted-foreground">
                {textbook.title} has been added to your library.
              </p>
            </div>
            <Link
              href={routes.textbookReader(textbook.id)}
              className="flex h-12 w-full items-center justify-center rounded-button bg-primary text-[15px] font-semibold text-primary-foreground transition-all duration-150 active:scale-[0.97]"
            >
              Read Textbook
            </Link>
            <Link
              href={routes.student.library}
              className="text-[13px] font-semibold text-muted-foreground"
            >
              Go to Library
            </Link>
          </>
        )}

        {pending && (
          <>
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
              <Clock className="h-7 w-7 text-muted-foreground" aria-hidden />
            </div>
            <div className="space-y-1">
              <p className="text-[15px] font-semibold text-foreground">Payment pending</p>
              <p className="text-[13px] text-muted-foreground">
                We haven&apos;t received confirmation yet. This page will update automatically
                once the payment clears.
              </p>
            </div>
            <Link
              href={routes.textbook(textbook.id)}
              className="flex h-12 w-full items-center justify-center rounded-button bg-muted text-[15px] font-semibold text-foreground transition-all duration-150 active:scale-[0.97]"
            >
              Back to Textbook
            </Link>
          </>
        )}

        {!success && !pending && (
          <>
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10">
              <XCircle className="h-7 w-7 text-destructive" aria-hidden />
            </div>
            <div className="space-y-1">
              <p className="text-[15px] font-semibold text-foreground">Payment failed</p>
              <p className="text-[13px] text-muted-foreground">
                Your payment could not be confirmed. You have not been charged for{" "}
                {textbook.title}.
              </p>
            </div>
            <Link
              href={routes.textbook(textbook.id)}
              className="flex h-12 w-full items-center justify-center rounded-button bg-primary text-[15px] font-semibold text-primary-foreground transition-all duration-150 active:scale-[0.97]"
            >
              Try Again
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
