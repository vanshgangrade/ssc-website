-- Lets a reviewer score an applicant 1-5 from the admin drawer, independent
-- of the free-text review note.
ALTER TABLE "Application" ADD COLUMN IF NOT EXISTS "rating" INTEGER;
