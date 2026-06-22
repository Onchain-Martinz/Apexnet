import { db } from "@/lib/db";
import { BootstrapAdminForm } from "@/components/admin/bootstrap-form";

export default async function AdminSetupPage() {
  const existingAdmin = await db.user.findFirst({
    where: { role: "ADMIN" },
    select: { id: true },
  });

  return (
    <div className="px-page pt-12 pb-6 space-y-section max-w-lg mx-auto">
      <header>
        <p className="text-[13px] font-medium text-muted-foreground">Apex · Setup</p>
        <h1 className="mt-0.5 text-title font-bold text-foreground">Create Admin Account</h1>
        <p className="mt-1 text-[13px] text-muted-foreground">
          One-time setup to create the founder admin account. This page disables itself once an admin exists.
        </p>
      </header>

      {existingAdmin ? (
        <div className="rounded-input border border-border bg-muted px-4 py-3">
          <p className="text-[13px] text-muted-foreground">
            An admin account already exists. This setup route is disabled.
          </p>
        </div>
      ) : (
        <BootstrapAdminForm />
      )}
    </div>
  );
}
