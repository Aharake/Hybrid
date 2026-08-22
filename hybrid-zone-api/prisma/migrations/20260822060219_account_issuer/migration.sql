-- AlterTable: Better Auth 1.7+ scopes account identity by issuer.
-- Safe as a required column with no default: the "account" table has no
-- rows yet (every prior sign-up attempt failed before this insert).
ALTER TABLE "account" ADD COLUMN "issuer" TEXT NOT NULL;
