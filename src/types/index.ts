// Re-export Prisma-generated types enriched with app-level helpers.
// Add computed/DTO shapes here — never bloat the Prisma schema with UI concerns.

export type { Role } from "@prisma/client";

// User with the role profile already joined (common query shape)
export type UserWithProfile = {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  role: import("@prisma/client").Role;
};

// Lightweight card representation of a book
export type BookCard = {
  id: string;
  title: string;
  coverUrl: string | null;
  authorName: string;
  isFree: boolean;
  price: number | null;
};

// Lightweight card representation of a course
export type CourseCard = {
  id: string;
  title: string;
  code: string | null;
  lecturerName: string;
  bookCount: number;
};

// Reading progress shape returned to client
export type ProgressState = {
  bookId: string;
  currentPage: number;
  totalPages: number | null;
  percentage: number;
};
