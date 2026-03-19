-- Create wizard_type enum
DO $$ BEGIN
  CREATE TYPE "wizard_type" AS ENUM ('payment_concept');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create wizard_drafts table
CREATE TABLE IF NOT EXISTS "wizard_drafts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "wizard_type" "wizard_type" NOT NULL,
  "entity_id" uuid NOT NULL,
  "data" jsonb NOT NULL DEFAULT '{}',
  "current_step" integer NOT NULL DEFAULT 0,
  "last_modified_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

-- Unique constraint: one draft per wizard type + entity
CREATE UNIQUE INDEX IF NOT EXISTS "idx_wizard_drafts_type_entity"
  ON "wizard_drafts" ("wizard_type", "entity_id");

-- Index for lookups by entity
CREATE INDEX IF NOT EXISTS "idx_wizard_drafts_entity"
  ON "wizard_drafts" ("entity_id");
