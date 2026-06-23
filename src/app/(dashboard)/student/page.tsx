import Link from "next/link";
import { BookOpen } from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { routes } from "@/config/routes";
import { getTimeOfDayGreeting } from "@/lib/utils/format";
import { getMaterialStatus, semesterMaterialSelect, courseTextbookSelect } from "@/lib/textbooks/semester-materials";
import { normalizeCourseCode } from "@/lib/textbooks/course-code";
import { SemesterOverviewCard } from "@/components/textbooks/semester-overview-card";
import { SemesterMaterialCard } from "@/components/textbooks/semester-material-card";
import { RecentMaterialCard } from "@/components/textbooks/recent-material-card";

const RECENT_COUNT = 5;
const PILOT_SEMESTER = 2; // Psychology pilot: second-semester courses only

// ── Helpers ─────────────────────────────────────────────────────────────────

function firstName(name: string | null | undefined): string {
  if (!name) return "there";
  return name.split(" ")[0];
}

function initials(name: string | null | undefined): string {
  if (!name) return "?";
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

// ── Empty states ─────────────────────────────────────────────────────────────

function IncompleteProfilePrompt() {
  return (
    <Link
      href={routes.student.settings}
      className="flex flex-col items-center gap-3 rounded-card border border-card-border bg-card px-6 py-10 text-center shadow-card transition-all duration-150 active:scale-[0.97]"
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
        <BookOpen className="h-7 w-7 text-muted-foreground" aria-hidden />
      </div>
      <div className="space-y-1">
        <p className="text-[15px] font-semibold text-foreground">Set up your profile</p>
        <p className="text-[13px] text-muted-foreground">
          Add your department and level to see materials for your semester
        </p>
      </div>
    </Link>
  );
}

function EmptySemesterMaterials() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-card border border-card-border bg-card px-6 py-10 text-center shadow-card">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
        <BookOpen className="h-7 w-7 text-muted-foreground" aria-hidden />
      </div>
      <div className="space-y-1">
        <p className="text-[15px] font-semibold text-foreground">No materials yet</p>
        <p className="text-[13px] text-muted-foreground">
          No courses found for your department and level yet
        </p>
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function StudentPage() {
  const session = await requireRole("STUDENT");
  const name = session.user.name;
  const greeting = getTimeOfDayGreeting();

  const profile = await db.studentProfile.findUnique({
    where: { userId: session.user.id },
    select: { departmentId: true, level: true },
  });

  const hasProgram = Boolean(profile?.departmentId && profile?.level);

  const courses = hasProgram
    ? await db.course.findMany({
        where: {
          departmentId: profile!.departmentId!,
          level: profile!.level!,
          semester: PILOT_SEMESTER,
        },
        orderBy: { code: "asc" },
        select: { id: true, code: true, title: true },
      })
    : [];

  // Course matching is courseCode-driven, not a courseId relation — a
  // textbook belongs to a course when normalizeCourseCode(textbook.courseCode)
  // === normalizeCourseCode(course.code). Both sides are stored canonically
  // (Course.code is seeded that way; textbook.courseCode is normalized at
  // upload time and backfilled for any pre-existing row — see
  // scripts/normalize-existing-course-codes.ts), which is what lets the SQL
  // `courseCode: { in: courseCodes } }` filter below match by exact string.
  // Normalizing again here is a cheap defensive no-op against that
  // guarantee, not a substitute for it — it cannot rescue a non-canonical
  // row the SQL filter already excluded from the result set.
  const courseCodes = courses.map((c) => normalizeCourseCode(c.code));
  const matchingTextbooks = courseCodes.length
    ? await db.textbook.findMany({
        where: { status: "PUBLISHED", courseCode: { in: courseCodes } },
        orderBy: { createdAt: "asc" },
        select: courseTextbookSelect,
      })
    : [];

  // First-published-wins per course code (mirrors the old take: 1 per course).
  const textbookByCourseCode = new Map<string, (typeof matchingTextbooks)[number]>();
  for (const textbook of matchingTextbooks) {
    const code = textbook.courseCode ? normalizeCourseCode(textbook.courseCode) : null;
    if (code && !textbookByCourseCode.has(code)) {
      textbookByCourseCode.set(code, textbook);
    }
  }

  const linkedTextbookIds = [...textbookByCourseCode.values()].map((t) => t.id);

  const ownedRows = linkedTextbookIds.length
    ? await db.studentLibrary.findMany({
        where: {
          studentId: session.user.id,
          textbookId: { in: linkedTextbookIds },
        },
        select: { textbookId: true },
      })
    : [];
  const ownedIds = new Set(ownedRows.map((r) => r.textbookId));

  const recentlyAdded = hasProgram
    ? await db.textbook.findMany({
        where: {
          status: "PUBLISHED",
          departmentId: profile!.departmentId!,
          id: { notIn: linkedTextbookIds },
        },
        orderBy: { createdAt: "desc" },
        take: RECENT_COUNT,
        select: semesterMaterialSelect,
      })
    : [];

  const total = courses.length;
  const acquired = courses.filter((c) => {
    const textbook = textbookByCourseCode.get(normalizeCourseCode(c.code));
    return textbook && ownedIds.has(textbook.id);
  }).length;
  const remaining = total - acquired;

  return (
    <div className="px-page pt-12 pb-10 space-y-10 max-w-2xl mx-auto">

      {/* ── Greeting ──────────────────────────────── */}
      <header className="flex items-start justify-between">
        <div>
          <h1 className="text-title font-bold text-foreground">
            {greeting}, {firstName(name)}
          </h1>
          <p className="mt-1.5 text-[13px] text-muted-foreground">
            Your academic materials for this semester
          </p>
        </div>

        {/* Avatar */}
        <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-primary">
          <span className="text-[13px] font-bold text-primary-foreground">
            {initials(name)}
          </span>
        </div>
      </header>

      {/* ── Semester overview ──────────────────────── */}
      {hasProgram && <SemesterOverviewCard total={total} acquired={acquired} remaining={remaining} />}

      {/* ── Semester materials ─────────────────────── */}
      <section>
        <h2 className="mb-4 text-[18px] font-bold text-foreground">
          Your Semester Materials
        </h2>
        {!hasProgram ? (
          <IncompleteProfilePrompt />
        ) : courses.length === 0 ? (
          <EmptySemesterMaterials />
        ) : (
          <div className="grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
            {courses.map((course) => {
              const textbook = textbookByCourseCode.get(normalizeCourseCode(course.code)) ?? null;
              return (
                <SemesterMaterialCard
                  key={course.id}
                  code={course.code}
                  title={course.title}
                  textbook={textbook ? { ...textbook, price: Number(textbook.price) } : null}
                  status={getMaterialStatus(Boolean(textbook), textbook ? ownedIds.has(textbook.id) : false)}
                />
              );
            })}
          </div>
        )}
      </section>

      {/* ── Recently added ─────────────────────────── */}
      {recentlyAdded.length > 0 && (
        <section>
          <h2 className="mb-4 text-[18px] font-bold text-foreground">
            Recently Added
          </h2>
          <div className="-mx-page flex gap-4 overflow-x-auto px-page pb-1 scrollbar-hide">
            {recentlyAdded.map((textbook) => (
              <RecentMaterialCard
                key={textbook.id}
                textbook={{ ...textbook, price: Number(textbook.price) }}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
