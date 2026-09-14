-- CreateTable
CREATE TABLE IF NOT EXISTS "InductionQuestion" (
    "id" TEXT NOT NULL,
    "cycleId" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "hint" TEXT,
    "type" TEXT NOT NULL,
    "options" TEXT[],
    "required" BOOLEAN NOT NULL DEFAULT true,
    "maxLength" INTEGER,
    "onlyFor" TEXT[],
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "InductionQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "InductionQuestion_cycleId_order_idx" ON "InductionQuestion"("cycleId", "order");

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "InductionQuestion" ADD CONSTRAINT "InductionQuestion_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "InductionCycle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;
