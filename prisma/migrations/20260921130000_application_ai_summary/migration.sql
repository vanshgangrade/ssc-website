-- Caches the AI-generated summary on the application row itself, so it's
-- computed once and reused, never recomputed on every drawer open.
ALTER TABLE "Application" ADD COLUMN IF NOT EXISTS "aiSummary" TEXT;
