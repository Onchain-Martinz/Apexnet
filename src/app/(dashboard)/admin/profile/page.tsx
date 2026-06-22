import { requireRole } from "@/lib/auth/session";
import { AdminProfilePanel } from "@/components/admin/profile-panel";

export default async function AdminProfilePage() {
  await requireRole("ADMIN");

  return (
    <div className="px-page pt-12 pb-6 space-y-section max-w-lg mx-auto">
      <header>
        <p className="text-[13px] font-medium text-muted-foreground">Apex · Admin</p>
        <h1 className="mt-0.5 text-title font-bold text-foreground">Profile</h1>
      </header>

      <AdminProfilePanel />
    </div>
  );
}
