import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { EditTextbookForm } from "@/components/lecturer/edit-textbook-form";

// ── Lecturer: Edit Textbook ─────────────────────────────────────────────────
// A lecturer may edit only their own textbook. Ownership is checked here
// (server-side, authoritative) in addition to the PATCH route itself —
// belt-and-suspenders, consistent with how every other lecturer-scoped page
// in this app re-verifies ownership rather than trusting the route alone.

export default async function EditTextbookPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireRole("LECTURER");
  const { id } = await params;

  const lecturerProfile = await db.lecturerProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });

  if (!lecturerProfile) {
    notFound();
  }

  const textbook = await db.textbook.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      description: true,
      price: true,
      level: true,
      courseCode: true,
      lecturerId: true,
      coverImageKey: true,
      department: { select: { name: true } },
    },
  });

  if (!textbook || textbook.lecturerId !== lecturerProfile.id) {
    notFound();
  }

  return (
    <EditTextbookForm
      textbookId={textbook.id}
      initial={{
        title: textbook.title,
        description: textbook.description ?? "",
        department: textbook.department?.name ?? "",
        level: String(textbook.level ?? ""),
        courseCode: textbook.courseCode ?? "",
        price: String(textbook.price),
        hasCover: Boolean(textbook.coverImageKey),
      }}
    />
  );
}
