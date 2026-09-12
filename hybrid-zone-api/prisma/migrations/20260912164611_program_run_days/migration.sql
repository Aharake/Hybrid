-- AlterTable: nullable JSON column, safe to add regardless of existing rows.
ALTER TABLE "program" ADD COLUMN "runDays" JSONB;
