-- Enforce at most one PENDING purchase per (student, textbook).
-- Prisma's schema language can't express partial/filtered unique indexes,
-- so this is applied directly via `prisma db execute`. Concurrent
-- /api/purchases/initialize requests that both try to create a PENDING
-- purchase for the same (studentId, textbookId) will have the second
-- insert rejected with a unique violation (Prisma error P2002).

CREATE UNIQUE INDEX IF NOT EXISTS "purchases_one_pending_per_student_textbook"
ON "purchases" ("studentId", "textbookId")
WHERE "status" = 'PENDING';
