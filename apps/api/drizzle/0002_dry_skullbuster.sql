-- Add service_execution_status enum
DO $$ BEGIN
  CREATE TYPE "public"."service_execution_status" AS ENUM('draft', 'confirmed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create service_executions table
CREATE TABLE IF NOT EXISTS "service_executions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "service_id" uuid NOT NULL,
  "condominium_id" uuid NOT NULL,
  "title" varchar(255) NOT NULL,
  "description" text,
  "execution_date" date NOT NULL,
  "total_amount" numeric(15, 2) DEFAULT '0' NOT NULL,
  "currency_id" uuid NOT NULL,
  "status" "service_execution_status" DEFAULT 'draft' NOT NULL,
  "invoice_number" varchar(100),
  "items" jsonb DEFAULT '[]',
  "attachments" jsonb DEFAULT '[]',
  "notes" text,
  "metadata" jsonb,
  "created_by" uuid,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

-- Foreign key constraints
DO $$ BEGIN
  ALTER TABLE "service_executions"
    ADD CONSTRAINT "service_executions_service_id_condominium_services_id_fk"
    FOREIGN KEY ("service_id")
    REFERENCES "condominium_services"("id")
    ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "service_executions"
    ADD CONSTRAINT "service_executions_condominium_id_condominiums_id_fk"
    FOREIGN KEY ("condominium_id")
    REFERENCES "condominiums"("id")
    ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "service_executions"
    ADD CONSTRAINT "service_executions_currency_id_currencies_id_fk"
    FOREIGN KEY ("currency_id")
    REFERENCES "currencies"("id")
    ON DELETE restrict ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "service_executions"
    ADD CONSTRAINT "service_executions_created_by_users_id_fk"
    FOREIGN KEY ("created_by")
    REFERENCES "users"("id")
    ON DELETE set null ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS "idx_service_executions_service" ON "service_executions" ("service_id");
CREATE INDEX IF NOT EXISTS "idx_service_executions_condominium" ON "service_executions" ("condominium_id");
CREATE INDEX IF NOT EXISTS "idx_service_executions_date" ON "service_executions" ("execution_date");
CREATE INDEX IF NOT EXISTS "idx_service_executions_status" ON "service_executions" ("status");
