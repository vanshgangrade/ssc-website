-- Crew "departments" became club "verticals", and the hostel/room question was
-- dropped from the form. Both guarded so the migration is safe to re-run and
-- safe on a database that never had the old shape.

-- RenameColumn
DO $$ BEGIN
    ALTER TABLE "Application" RENAME COLUMN "departments" TO "verticals";
EXCEPTION
    WHEN undefined_column THEN NULL;
    WHEN duplicate_column THEN NULL;
END $$;

-- DropColumn
ALTER TABLE "Application" DROP COLUMN IF EXISTS "hostel";
