-- AlterTable
ALTER TABLE "run_activity" ADD COLUMN "title" TEXT;

-- AlterTable
ALTER TABLE "workout_log" ADD COLUMN "durationSec" INTEGER;

-- AlterTable
ALTER TABLE "preferences" ADD COLUMN "settings" JSONB;
