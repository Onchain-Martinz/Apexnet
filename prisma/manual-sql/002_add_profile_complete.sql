-- Add profileComplete column to users.
-- Existing credentials users already provided all required information
-- during sign-up, so seed them as complete. New Google-OAuth users will
-- start as false (the Prisma DEFAULT) and set to true after the
-- /complete-profile step.
ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "profile_complete" BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE "users"
  SET "profile_complete" = TRUE
  WHERE "hashed_password" IS NOT NULL;
