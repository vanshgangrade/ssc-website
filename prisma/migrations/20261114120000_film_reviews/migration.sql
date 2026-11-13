-- Film diary: Letterboxd-style ratings and reviews of films the club has screened.
-- One review per person per film; rating is in half-stars (1 = ½★ … 10 = ★★★★★).

-- CreateTable
CREATE TABLE "Film" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "year" INTEGER,
    "meta" TEXT NOT NULL DEFAULT '',
    "posterUrl" TEXT NOT NULL,
    "screenedOn" TIMESTAMP(3),
    "reviewsOpen" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Film_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "filmId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "body" TEXT NOT NULL DEFAULT '',
    "spoiler" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Film_slug_key" ON "Film"("slug");

-- CreateIndex
CREATE INDEX "Review_filmId_createdAt_idx" ON "Review"("filmId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Review_userId_filmId_key" ON "Review"("userId", "filmId");

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_filmId_fkey" FOREIGN KEY ("filmId") REFERENCES "Film"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Ratings outside ½★–5★ are rejected by the database as well as the app.
ALTER TABLE "Review" ADD CONSTRAINT "Review_rating_range" CHECK ("rating" BETWEEN 1 AND 10);

-- Open the diary with the club's latest screening.
INSERT INTO "Film" ("id", "slug", "title", "year", "meta", "posterUrl", "reviewsOpen")
VALUES ('film_ramayana_part_1', 'ramayana-part-1', 'Ramayana: Part 1', 2026, 'Mythology · Epic', '/club/posters/ramayana.jpg', true)
ON CONFLICT ("slug") DO NOTHING;
