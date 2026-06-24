import { BottomNav } from "@/components/layout/bottom-nav";
import { ImpersonationBanner } from "@/components/admin/impersonation-banner";
import { ForcedPasswordChangeModal } from "@/components/auth/forced-password-change-modal";
import { getSession } from "@/lib/auth/session";

/*
 * Dashboard shell — mobile-first.
 * Content scrolls inside the viewport; BottomNav is fixed at bottom.
 * pb-nav pushes content above the 72px nav + device safe area.
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  const isImpersonating = Boolean(session?.user?.impersonatorId);
  // Suppressed while an admin is impersonating — this reflects the target
  // lecturer's real (pending) state, not the admin's own, and would
  // otherwise block the admin mid-onboarding. Real lecturer-owned sessions
  // (impersonatorId unset) are completely unaffected by this condition.
  const mustChangePassword = Boolean(session?.user?.mustChangePassword) && !isImpersonating;

  return (
    <div className="min-h-dvh bg-background">
      {isImpersonating && <ImpersonationBanner />}

      {/* Scrollable content — padded away from the fixed bottom nav */}
      <main className="pb-nav overflow-y-auto">
        {children}
      </main>

      <BottomNav />

      {mustChangePassword && <ForcedPasswordChangeModal />}
    </div>
  );
}
