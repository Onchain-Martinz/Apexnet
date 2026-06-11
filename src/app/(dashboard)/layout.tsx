import { BottomNav } from "@/components/layout/bottom-nav";

/*
 * Dashboard shell — mobile-first.
 * Content scrolls inside the viewport; BottomNav is fixed at bottom.
 * pb-nav pushes content above the 72px nav + device safe area.
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-background">
      {/* Scrollable content — padded away from the fixed bottom nav */}
      <main className="pb-nav overflow-y-auto">
        {children}
      </main>

      <BottomNav />
    </div>
  );
}
