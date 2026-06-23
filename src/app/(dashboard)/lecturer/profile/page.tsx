import { requireRole } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { ProfilePanel } from "@/components/lecturer/profile-panel";

export default async function LecturerProfilePage() {
  const session = await requireRole("LECTURER");

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      name: true,
      email: true,
      lecturerProfile: {
        select: {
          title: true,
          phone: true,
          bio: true,
          verified: true,
          bankCode: true,
          bankName: true,
          bankAccountNumber: true,
          bankAccountName: true,
          bankAccountVerifiedAt: true,
          university: { select: { name: true } },
          department: { select: { name: true } },
        },
      },
    },
  });

  const profile = user?.lecturerProfile ?? null;

  return (
    <div className="px-page pt-12 pb-6 space-y-section max-w-lg mx-auto">
      <header>
        <h1 className="text-title font-bold text-foreground">Profile</h1>
      </header>

      <ProfilePanel
        email={user?.email ?? ""}
        verified={profile?.verified ?? false}
        initial={{
          name: user?.name ?? "",
          title: profile?.title ?? "",
          university: profile?.university?.name ?? "",
          department: profile?.department?.name ?? "",
          phone: profile?.phone ?? "",
          bio: profile?.bio ?? "",
        }}
        initialBank={{
          bankCode: profile?.bankCode ?? "",
          bankName: profile?.bankName ?? "",
          bankAccountNumber: profile?.bankAccountNumber ?? "",
          bankAccountName: profile?.bankAccountName ?? "",
          bankAccountVerifiedAt: profile?.bankAccountVerifiedAt?.toISOString() ?? null,
        }}
      />
    </div>
  );
}
