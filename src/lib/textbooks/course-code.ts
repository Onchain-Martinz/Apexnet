// ── Course code normalization ───────────────────────────────────────────────
// Canonical form used everywhere a course code is stored or compared:
// uploads, course lookups, and student-dashboard matching. Lecturers type
// course codes inconsistently ("PSY 202", "psy-202", "PSY_202") — this makes
// all of those equivalent without any fuzzy/approximate matching. Different
// codes (PSY220 vs PSY202, PSY20 vs PSY202) must never be conflated, so this
// only strips whitespace/hyphens/underscores — it never touches digits or
// reorders characters.

export function normalizeCourseCode(raw: string): string {
  return raw
    .trim()
    .toUpperCase()
    .replace(/[\s\-_]+/g, "");
}
