-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "ApplicationStatus" AS ENUM ('SUBMITTED', 'SHORTLISTED', 'WAITLISTED', 'REJECTED', 'ACCEPTED');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "InductionCycle" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "isOpen" BOOLEAN NOT NULL DEFAULT false,
    "closesAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InductionCycle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Application" (
    "id" TEXT NOT NULL,
    "cycleId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "bitsEmail" TEXT NOT NULL,
    "bitsId" TEXT NOT NULL,
    "yearOfStudy" TEXT NOT NULL,
    "hostel" TEXT,
    "departments" TEXT[],
    "answers" JSONB NOT NULL,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'SUBMITTED',
    "reviewNote" TEXT,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Application_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Application_cycleId_userId_key" ON "Application"("cycleId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Application_cycleId_bitsId_key" ON "Application"("cycleId", "bitsId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Application_cycleId_status_idx" ON "Application"("cycleId", "status");

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "Application" ADD CONSTRAINT "Application_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "InductionCycle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "Application" ADD CONSTRAINT "Application_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;
