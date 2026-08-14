/*
  Warnings:

  - You are about to drop the column `movie` on the `Vote` table. All the data in the column will be lost.
  - Added the required column `movieId` to the `Vote` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "PollSettings" ADD COLUMN     "closesAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Vote" DROP COLUMN "movie",
ADD COLUMN     "movieId" TEXT NOT NULL;

-- DropEnum
DROP TYPE "Movie";

-- CreateTable
CREATE TABLE "Movie" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "meta" TEXT NOT NULL,
    "tagline" TEXT NOT NULL,
    "posterUrl" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Movie_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie"("id") ON DELETE CASCADE ON UPDATE CASCADE;
