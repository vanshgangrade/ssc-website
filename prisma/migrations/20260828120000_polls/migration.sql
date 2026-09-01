-- CreateEnum
CREATE TYPE "PollStatus" AS ENUM ('DRAFT', 'LIVE', 'CLOSED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "Poll" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" "PollStatus" NOT NULL DEFAULT 'DRAFT',
    "isOpen" BOOLEAN NOT NULL DEFAULT true,
    "closesAt" TIMESTAMP(3),
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Poll_pkey" PRIMARY KEY ("id")
);

-- Backfill: fold the old singleton PollSettings plus every existing movie
-- and vote into one migrated Poll, so nothing already collected is lost.
-- It's created LIVE so the site keeps showing the same ballot right after
-- this migration runs.
INSERT INTO "Poll" ("id", "title", "status", "isOpen", "closesAt")
SELECT
  'migrated-poll-001',
  'Migrated Poll',
  'LIVE',
  COALESCE((SELECT "isOpen" FROM "PollSettings" WHERE "id" = 'singleton'), true),
  (SELECT "closesAt" FROM "PollSettings" WHERE "id" = 'singleton');

-- AlterTable
ALTER TABLE "Movie" ADD COLUMN "pollId" TEXT;
UPDATE "Movie" SET "pollId" = 'migrated-poll-001';
ALTER TABLE "Movie" ALTER COLUMN "pollId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Vote" ADD COLUMN "pollId" TEXT;
UPDATE "Vote" v SET "pollId" = m."pollId" FROM "Movie" m WHERE m."id" = v."movieId";
ALTER TABLE "Vote" ALTER COLUMN "pollId" SET NOT NULL;

-- Replace the old "one vote ever, per user" constraint with "one vote per
-- user per poll" — this is what lets the same person vote again in a new poll.
DROP INDEX "Vote_userId_key";
CREATE UNIQUE INDEX "Vote_userId_pollId_key" ON "Vote"("userId", "pollId");

-- AddForeignKey
ALTER TABLE "Movie" ADD CONSTRAINT "Movie_pollId_fkey" FOREIGN KEY ("pollId") REFERENCES "Poll"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_pollId_fkey" FOREIGN KEY ("pollId") REFERENCES "Poll"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- DropTable
-- PollSettings is superseded by per-poll isOpen/closesAt on "Poll".
DROP TABLE "PollSettings";
