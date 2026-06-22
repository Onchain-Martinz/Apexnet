import { requireRole } from "@/lib/auth/session";
import { getLecturerProfile } from "@/lib/data/lecturer";

export default async function LecturerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireRole("LECTURER");
  // Warm the per-request cache — all lecturer pages hit this cached result, zero extra queries.
  await getLecturerProfile(session.user.id);
  return <>{children}</>;
}
