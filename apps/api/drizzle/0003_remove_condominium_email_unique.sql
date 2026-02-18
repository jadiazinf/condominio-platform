-- Remove unique constraint and NOT NULL from condominiums.email
ALTER TABLE "condominiums" DROP CONSTRAINT IF EXISTS "condominiums_email_unique";
ALTER TABLE "condominiums" ALTER COLUMN "email" DROP NOT NULL;
