import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import { routes } from "@/config/routes";
import { CreateLecturerForm } from "@/components/admin/create-lecturer-form";

export default async function NewLecturerPage() {
  await requireRole("ADMIN");

  return (
    <div className="px-page pt-12 pb-6 space-y-section max-w-lg mx-auto">
      <header className="flex items-center gap-3">
        <Link
          href={routes.admin.lecturers}
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full hover:bg-muted transition-colors"
          aria-label="Back to lecturers"
        >
          <ChevronLeft className="h-5 w-5 text-foreground" aria-hidden />
        </Link>
        <div>
          <p className="text-[13px] font-medium text-muted-foreground">Apex · Admin</p>
          <h1 className="mt-0.5 text-title font-bold text-foreground">New Lecturer</h1>
        </div>
      </header>

      <CreateLecturerForm />
    </div>
  );
}
