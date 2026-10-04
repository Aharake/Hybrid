-- AlterTable: nullable, safe to add regardless of existing rows.
ALTER TABLE "onboarding_answers" ADD COLUMN "referralCode" TEXT;
