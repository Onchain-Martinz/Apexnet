import type { Prisma } from "@prisma/client";

// Fields rendered on the "Recently Added" cards (still a flat,
// department-wide Textbook query — unaffected by the course catalogue).
export const semesterMaterialSelect = {
  id: true,
  title: true,
  price: true,
  isFree: true,
  coverImageKey: true,
  courseCode: true,
} satisfies Prisma.TextbookSelect;

// Fields rendered for the textbook linked to a course on the "Your Semester
// Materials" grid. courseCode is the matching key back to its Course (the
// card itself shows the course's own title, not the textbook's).
export const courseTextbookSelect = {
  id: true,
  price: true,
  isFree: true,
  coverImageKey: true,
  courseCode: true,
} satisfies Prisma.TextbookSelect;

export type MaterialStatus = "owned" | "available" | "not_published";

export function getMaterialStatus(isPublished: boolean, owned: boolean): MaterialStatus {
  if (owned) return "owned";
  return isPublished ? "available" : "not_published";
}
