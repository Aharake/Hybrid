-- AlterTable: nullable columns, safe to add regardless of existing rows.
ALTER TABLE "onboarding_answers" ADD COLUMN "age" INTEGER;
ALTER TABLE "onboarding_answers" ADD COLUMN "weightKg" DOUBLE PRECISION;
ALTER TABLE "onboarding_answers" ADD COLUMN "heightCm" DOUBLE PRECISION;
