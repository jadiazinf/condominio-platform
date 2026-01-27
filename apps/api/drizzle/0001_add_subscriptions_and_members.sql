-- Add subscription and member enums
DO $$ BEGIN
 CREATE TYPE "subscription_status" AS ENUM('trial', 'active', 'inactive', 'cancelled', 'suspended');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 CREATE TYPE "billing_cycle" AS ENUM('monthly', 'quarterly', 'semi_annual', 'annual', 'custom');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 CREATE TYPE "invoice_status" AS ENUM('draft', 'sent', 'pending', 'paid', 'overdue', 'cancelled', 'refunded');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 CREATE TYPE "member_role" AS ENUM('admin', 'accountant', 'support', 'viewer');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- Create management_company_subscriptions table
CREATE TABLE IF NOT EXISTS "management_company_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"management_company_id" uuid NOT NULL,
	"subscription_name" varchar(100),
	"billing_cycle" "billing_cycle" NOT NULL,
	"base_price" numeric(10, 2) NOT NULL,
	"currency_id" uuid,
	"max_condominiums" integer,
	"max_users" integer,
	"max_storage_gb" integer,
	"custom_features" jsonb,
	"custom_rules" jsonb,
	"status" "subscription_status" DEFAULT 'trial' NOT NULL,
	"start_date" timestamp DEFAULT now() NOT NULL,
	"end_date" timestamp,
	"next_billing_date" timestamp,
	"trial_ends_at" timestamp,
	"auto_renew" boolean DEFAULT true,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"created_by" uuid,
	"cancelled_at" timestamp,
	"cancelled_by" uuid,
	"cancellation_reason" text
);

-- Create subscription_invoices table
CREATE TABLE IF NOT EXISTS "subscription_invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_number" varchar(50) NOT NULL,
	"subscription_id" uuid NOT NULL,
	"management_company_id" uuid NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"currency_id" uuid,
	"tax_amount" numeric(10, 2) DEFAULT '0',
	"total_amount" numeric(10, 2) NOT NULL,
	"status" "invoice_status" DEFAULT 'pending' NOT NULL,
	"issue_date" timestamp DEFAULT now() NOT NULL,
	"due_date" timestamp NOT NULL,
	"paid_date" timestamp,
	"payment_id" uuid,
	"payment_method" varchar(50),
	"billing_period_start" timestamp NOT NULL,
	"billing_period_end" timestamp NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "subscription_invoices_invoice_number_unique" UNIQUE("invoice_number")
);

-- Create management_company_members table
CREATE TABLE IF NOT EXISTS "management_company_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"management_company_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role_name" "member_role" NOT NULL,
	"permissions" jsonb,
	"is_primary_admin" boolean DEFAULT false,
	"joined_at" timestamp DEFAULT now(),
	"invited_at" timestamp,
	"invited_by" uuid,
	"is_active" boolean DEFAULT true,
	"deactivated_at" timestamp,
	"deactivated_by" uuid,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);

-- Add foreign keys for management_company_subscriptions
DO $$ BEGIN
 ALTER TABLE "management_company_subscriptions" ADD CONSTRAINT "management_company_subscriptions_management_company_id_management_companies_id_fk" FOREIGN KEY ("management_company_id") REFERENCES "public"."management_companies"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "management_company_subscriptions" ADD CONSTRAINT "management_company_subscriptions_currency_id_currencies_id_fk" FOREIGN KEY ("currency_id") REFERENCES "public"."currencies"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "management_company_subscriptions" ADD CONSTRAINT "management_company_subscriptions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "management_company_subscriptions" ADD CONSTRAINT "management_company_subscriptions_cancelled_by_users_id_fk" FOREIGN KEY ("cancelled_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- Add foreign keys for subscription_invoices
DO $$ BEGIN
 ALTER TABLE "subscription_invoices" ADD CONSTRAINT "subscription_invoices_subscription_id_management_company_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."management_company_subscriptions"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "subscription_invoices" ADD CONSTRAINT "subscription_invoices_management_company_id_management_companies_id_fk" FOREIGN KEY ("management_company_id") REFERENCES "public"."management_companies"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "subscription_invoices" ADD CONSTRAINT "subscription_invoices_currency_id_currencies_id_fk" FOREIGN KEY ("currency_id") REFERENCES "public"."currencies"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "subscription_invoices" ADD CONSTRAINT "subscription_invoices_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- Add foreign keys for management_company_members
DO $$ BEGIN
 ALTER TABLE "management_company_members" ADD CONSTRAINT "management_company_members_management_company_id_management_companies_id_fk" FOREIGN KEY ("management_company_id") REFERENCES "public"."management_companies"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "management_company_members" ADD CONSTRAINT "management_company_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "management_company_members" ADD CONSTRAINT "management_company_members_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "management_company_members" ADD CONSTRAINT "management_company_members_deactivated_by_users_id_fk" FOREIGN KEY ("deactivated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- Create indexes for management_company_subscriptions
CREATE INDEX IF NOT EXISTS "idx_subscriptions_company" ON "management_company_subscriptions" USING btree ("management_company_id");
CREATE INDEX IF NOT EXISTS "idx_subscriptions_status" ON "management_company_subscriptions" USING btree ("status");
CREATE INDEX IF NOT EXISTS "idx_subscriptions_next_billing" ON "management_company_subscriptions" USING btree ("next_billing_date");
CREATE INDEX IF NOT EXISTS "idx_subscriptions_created_by" ON "management_company_subscriptions" USING btree ("created_by");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_subscriptions_active_unique" ON "management_company_subscriptions" USING btree ("management_company_id","status");

-- Create indexes for subscription_invoices
CREATE INDEX IF NOT EXISTS "idx_invoices_subscription" ON "subscription_invoices" USING btree ("subscription_id");
CREATE INDEX IF NOT EXISTS "idx_invoices_company" ON "subscription_invoices" USING btree ("management_company_id");
CREATE INDEX IF NOT EXISTS "idx_invoices_status" ON "subscription_invoices" USING btree ("status");
CREATE INDEX IF NOT EXISTS "idx_invoices_due_date" ON "subscription_invoices" USING btree ("due_date");
CREATE INDEX IF NOT EXISTS "idx_invoices_number" ON "subscription_invoices" USING btree ("invoice_number");
CREATE INDEX IF NOT EXISTS "idx_invoices_payment" ON "subscription_invoices" USING btree ("payment_id");

-- Create indexes for management_company_members
CREATE INDEX IF NOT EXISTS "idx_members_company" ON "management_company_members" USING btree ("management_company_id");
CREATE INDEX IF NOT EXISTS "idx_members_user" ON "management_company_members" USING btree ("user_id");
CREATE INDEX IF NOT EXISTS "idx_members_role" ON "management_company_members" USING btree ("role_name");
CREATE INDEX IF NOT EXISTS "idx_members_primary" ON "management_company_members" USING btree ("is_primary_admin");
CREATE INDEX IF NOT EXISTS "idx_members_invited_by" ON "management_company_members" USING btree ("invited_by");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_members_unique" ON "management_company_members" USING btree ("management_company_id","user_id");
