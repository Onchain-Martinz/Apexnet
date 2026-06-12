import { requireRole } from "@/lib/auth/session";
import { StudentProfilePanel } from "@/components/student/profile-panel";

export default async function StudentSettingsPage() {
  await requireRole("STUDENT");

  return (
    <div className="px-page pt-12 pb-6 space-y-section max-w-lg mx-auto">
      <header>
        <h1 className="text-title font-bold text-foreground">Profile</h1>
      </header>

      <StudentProfilePanel />
    </div>
  );
}
