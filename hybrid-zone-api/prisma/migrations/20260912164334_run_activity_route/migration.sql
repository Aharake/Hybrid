-- AlterTable: nullable JSON column, safe to add regardless of existing rows.
ALTER TABLE "run_activity" ADD COLUMN "route" JSONB;
