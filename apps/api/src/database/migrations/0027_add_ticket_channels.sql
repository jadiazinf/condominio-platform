-- Add ticket channel enum and new ticket categories for multi-channel support

-- 1. Create ticket_channel enum
CREATE TYPE "ticket_channel" AS ENUM ('resident_to_admin', 'resident_to_support', 'admin_to_support');

-- 2. Add channel and condominium_id columns
ALTER TABLE "support_tickets" ADD COLUMN "channel" ticket_channel;
ALTER TABLE "support_tickets" ADD COLUMN "condominium_id" uuid REFERENCES condominiums(id);

-- 3. Backfill existing tickets as admin_to_support (all current tickets are from admin/superadmin)
UPDATE "support_tickets" SET "channel" = 'admin_to_support' WHERE "channel" IS NULL;

-- 4. Make channel NOT NULL after backfill
ALTER TABLE "support_tickets" ALTER COLUMN "channel" SET NOT NULL;

-- 5. Add new ticket categories for resident→admin tickets
ALTER TYPE "ticket_category" ADD VALUE 'maintenance';
ALTER TYPE "ticket_category" ADD VALUE 'payment_issue';
ALTER TYPE "ticket_category" ADD VALUE 'access_request';
ALTER TYPE "ticket_category" ADD VALUE 'noise_complaint';

-- 6. Add indexes
CREATE INDEX "idx_tickets_channel" ON "support_tickets" ("channel");
CREATE INDEX "idx_tickets_condominium" ON "support_tickets" ("condominium_id");
