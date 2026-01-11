CREATE TYPE "public"."adjustment_type" AS ENUM('discount', 'increase', 'correction', 'waiver');--> statement-breakpoint
CREATE TYPE "public"."allocation_status" AS ENUM('pending', 'allocated', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."audit_action" AS ENUM('INSERT', 'UPDATE', 'DELETE');--> statement-breakpoint
CREATE TYPE "public"."concept_type" AS ENUM('maintenance', 'condominium_fee', 'extraordinary', 'fine');--> statement-breakpoint
CREATE TYPE "public"."document_type" AS ENUM('invoice', 'receipt', 'statement', 'contract', 'regulation', 'minutes', 'other');--> statement-breakpoint
CREATE TYPE "public"."expense_status" AS ENUM('pending', 'approved', 'rejected', 'paid');--> statement-breakpoint
CREATE TYPE "public"."formula_type" AS ENUM('fixed', 'expression', 'per_unit');--> statement-breakpoint
CREATE TYPE "public"."frequency_type" AS ENUM('days', 'monthly', 'quarterly', 'semi_annual', 'annual');--> statement-breakpoint
CREATE TYPE "public"."gateway_type" AS ENUM('stripe', 'banco_plaza', 'paypal', 'zelle', 'other');--> statement-breakpoint
CREATE TYPE "public"."generation_method" AS ENUM('manual_single', 'manual_batch', 'scheduled', 'range');--> statement-breakpoint
CREATE TYPE "public"."generation_status" AS ENUM('completed', 'partial', 'failed');--> statement-breakpoint
CREATE TYPE "public"."interest_type" AS ENUM('simple', 'compound', 'fixed_amount');--> statement-breakpoint
CREATE TYPE "public"."location_type" AS ENUM('country', 'province', 'city');--> statement-breakpoint
CREATE TYPE "public"."message_type" AS ENUM('message', 'notification', 'announcement');--> statement-breakpoint
CREATE TYPE "public"."ownership_type" AS ENUM('owner', 'co-owner', 'tenant');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('transfer', 'cash', 'card', 'gateway');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('pending', 'pending_verification', 'completed', 'failed', 'refunded', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."priority" AS ENUM('low', 'normal', 'high', 'urgent');--> statement-breakpoint
CREATE TYPE "public"."quota_status" AS ENUM('pending', 'paid', 'overdue', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."recipient_type" AS ENUM('user', 'condominium', 'building', 'unit');--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"table_name" varchar(100) NOT NULL,
	"record_id" uuid NOT NULL,
	"action" "audit_action" NOT NULL,
	"old_values" jsonb,
	"new_values" jsonb,
	"changed_fields" text[],
	"user_id" uuid,
	"ip_address" "inet",
	"user_agent" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "buildings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"condominium_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"code" varchar(50),
	"address" varchar(500),
	"floors_count" integer,
	"units_count" integer,
	"bank_account_holder" varchar(255),
	"bank_name" varchar(100),
	"bank_account_number" varchar(100),
	"bank_account_type" varchar(50),
	"is_active" boolean DEFAULT true,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"created_by" uuid
);
--> statement-breakpoint
CREATE TABLE "condominiums" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"code" varchar(50),
	"management_company_id" uuid,
	"address" varchar(500),
	"location_id" uuid,
	"email" varchar(255),
	"phone" varchar(50),
	"default_currency_id" uuid,
	"is_active" boolean DEFAULT true,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"created_by" uuid,
	CONSTRAINT "condominiums_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "currencies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(10) NOT NULL,
	"name" varchar(100) NOT NULL,
	"symbol" varchar(10),
	"is_base_currency" boolean DEFAULT false,
	"is_active" boolean DEFAULT true,
	"decimals" integer DEFAULT 2,
	"registered_by" uuid,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "currencies_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_type" "document_type" NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"condominium_id" uuid,
	"building_id" uuid,
	"unit_id" uuid,
	"user_id" uuid,
	"payment_id" uuid,
	"quota_id" uuid,
	"expense_id" uuid,
	"file_url" text NOT NULL,
	"file_name" varchar(255),
	"file_size" integer,
	"file_type" varchar(50),
	"document_date" date,
	"document_number" varchar(100),
	"is_public" boolean DEFAULT false,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"created_by" uuid
);
--> statement-breakpoint
CREATE TABLE "entity_payment_gateways" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payment_gateway_id" uuid NOT NULL,
	"condominium_id" uuid,
	"building_id" uuid,
	"entity_configuration" jsonb,
	"is_active" boolean DEFAULT true,
	"registered_by" uuid,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "exchange_rates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"from_currency_id" uuid NOT NULL,
	"to_currency_id" uuid NOT NULL,
	"rate" numeric(20, 8) NOT NULL,
	"effective_date" date NOT NULL,
	"source" varchar(100),
	"created_by" uuid,
	"registered_by" uuid,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "check_different_currencies" CHECK (from_currency_id != to_currency_id)
);
--> statement-breakpoint
CREATE TABLE "expense_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"parent_category_id" uuid,
	"is_active" boolean DEFAULT true,
	"registered_by" uuid,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "expenses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"condominium_id" uuid,
	"building_id" uuid,
	"expense_category_id" uuid,
	"description" text NOT NULL,
	"expense_date" date NOT NULL,
	"amount" numeric(15, 2) NOT NULL,
	"currency_id" uuid NOT NULL,
	"vendor_name" varchar(255),
	"vendor_tax_id" varchar(100),
	"invoice_number" varchar(100),
	"invoice_url" text,
	"status" "expense_status" DEFAULT 'pending',
	"approved_by" uuid,
	"approved_at" timestamp,
	"notes" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"created_by" uuid
);
--> statement-breakpoint
CREATE TABLE "interest_configurations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"condominium_id" uuid,
	"building_id" uuid,
	"payment_concept_id" uuid,
	"name" varchar(255) NOT NULL,
	"description" text,
	"interest_type" "interest_type" NOT NULL,
	"interest_rate" numeric(10, 6),
	"fixed_amount" numeric(15, 2),
	"calculation_period" varchar(50),
	"grace_period_days" integer DEFAULT 0,
	"currency_id" uuid,
	"is_active" boolean DEFAULT true,
	"effective_from" date NOT NULL,
	"effective_to" date,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"created_by" uuid
);
--> statement-breakpoint
CREATE TABLE "locations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(200) NOT NULL,
	"location_type" "location_type" NOT NULL,
	"parent_id" uuid,
	"code" varchar(50),
	"is_active" boolean DEFAULT true,
	"metadata" jsonb,
	"registered_by" uuid,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "management_companies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"legal_name" varchar(255),
	"tax_id" varchar(100),
	"email" varchar(255),
	"phone" varchar(50),
	"website" varchar(255),
	"address" varchar(500),
	"location_id" uuid,
	"is_active" boolean DEFAULT true,
	"logo_url" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"created_by" uuid,
	CONSTRAINT "management_companies_tax_id_unique" UNIQUE("tax_id")
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sender_id" uuid NOT NULL,
	"recipient_type" "recipient_type" NOT NULL,
	"recipient_user_id" uuid,
	"recipient_condominium_id" uuid,
	"recipient_building_id" uuid,
	"recipient_unit_id" uuid,
	"subject" varchar(255),
	"body" text NOT NULL,
	"message_type" "message_type" DEFAULT 'message',
	"priority" "priority" DEFAULT 'normal',
	"attachments" jsonb,
	"is_read" boolean DEFAULT false,
	"read_at" timestamp,
	"metadata" jsonb,
	"registered_by" uuid,
	"sent_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "payment_applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payment_id" uuid NOT NULL,
	"quota_id" uuid NOT NULL,
	"applied_amount" numeric(15, 2) NOT NULL,
	"applied_to_principal" numeric(15, 2) DEFAULT '0',
	"applied_to_interest" numeric(15, 2) DEFAULT '0',
	"registered_by" uuid,
	"applied_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "payment_concepts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"condominium_id" uuid,
	"building_id" uuid,
	"name" varchar(255) NOT NULL,
	"description" text,
	"concept_type" "concept_type" NOT NULL,
	"is_recurring" boolean DEFAULT true,
	"recurrence_period" varchar(50),
	"currency_id" uuid NOT NULL,
	"is_active" boolean DEFAULT true,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"created_by" uuid
);
--> statement-breakpoint
CREATE TABLE "payment_gateways" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"gateway_type" "gateway_type" NOT NULL,
	"configuration" jsonb,
	"supported_currencies" uuid[],
	"is_active" boolean DEFAULT true,
	"is_sandbox" boolean DEFAULT false,
	"metadata" jsonb,
	"registered_by" uuid,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "payment_gateways_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "payment_pending_allocations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payment_id" uuid NOT NULL,
	"pending_amount" numeric(15, 2) NOT NULL,
	"currency_id" uuid NOT NULL,
	"status" "allocation_status" DEFAULT 'pending' NOT NULL,
	"resolution_type" varchar(50),
	"resolution_notes" text,
	"allocated_to_quota_id" uuid,
	"created_at" timestamp DEFAULT now(),
	"allocated_by" uuid,
	"allocated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payment_number" varchar(100),
	"user_id" uuid NOT NULL,
	"unit_id" uuid NOT NULL,
	"amount" numeric(15, 2) NOT NULL,
	"currency_id" uuid NOT NULL,
	"paid_amount" numeric(15, 2),
	"paid_currency_id" uuid,
	"exchange_rate" numeric(20, 8),
	"payment_method" "payment_method" NOT NULL,
	"payment_gateway_id" uuid,
	"payment_details" jsonb,
	"payment_date" date NOT NULL,
	"registered_at" timestamp DEFAULT now(),
	"status" "payment_status" DEFAULT 'completed',
	"receipt_url" text,
	"receipt_number" varchar(100),
	"notes" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"registered_by" uuid,
	"verified_by" uuid,
	"verified_at" timestamp,
	"verification_notes" text,
	CONSTRAINT "payments_payment_number_unique" UNIQUE("payment_number")
);
--> statement-breakpoint
CREATE TABLE "permissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"module" varchar(50) NOT NULL,
	"action" varchar(50) NOT NULL,
	"registered_by" uuid,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "permissions_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "quota_adjustments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"quota_id" uuid NOT NULL,
	"previous_amount" numeric(15, 2) NOT NULL,
	"new_amount" numeric(15, 2) NOT NULL,
	"adjustment_type" "adjustment_type" NOT NULL,
	"reason" text NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "check_amount_changed" CHECK (previous_amount != new_amount)
);
--> statement-breakpoint
CREATE TABLE "quota_formulas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"condominium_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"formula_type" "formula_type" NOT NULL,
	"fixed_amount" numeric(15, 2),
	"expression" text,
	"variables" jsonb,
	"unit_amounts" jsonb,
	"currency_id" uuid NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_by" uuid,
	"updated_at" timestamp DEFAULT now(),
	"update_reason" text
);
--> statement-breakpoint
CREATE TABLE "quota_generation_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"generation_rule_id" uuid,
	"generation_schedule_id" uuid,
	"quota_formula_id" uuid,
	"generation_method" "generation_method" NOT NULL,
	"period_year" integer NOT NULL,
	"period_month" integer,
	"period_description" varchar(100),
	"quotas_created" integer DEFAULT 0 NOT NULL,
	"quotas_failed" integer DEFAULT 0 NOT NULL,
	"total_amount" numeric(15, 2),
	"currency_id" uuid,
	"units_affected" uuid[],
	"parameters" jsonb,
	"formula_snapshot" jsonb,
	"status" "generation_status" NOT NULL,
	"error_details" text,
	"generated_by" uuid NOT NULL,
	"generated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "quota_generation_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"condominium_id" uuid NOT NULL,
	"building_id" uuid,
	"payment_concept_id" uuid NOT NULL,
	"quota_formula_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"effective_from" date NOT NULL,
	"effective_to" date,
	"is_active" boolean DEFAULT true,
	"created_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_by" uuid,
	"updated_at" timestamp DEFAULT now(),
	"update_reason" text
);
--> statement-breakpoint
CREATE TABLE "quota_generation_schedules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"quota_generation_rule_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"frequency_type" "frequency_type" NOT NULL,
	"frequency_value" integer,
	"generation_day" integer NOT NULL,
	"periods_in_advance" integer DEFAULT 1,
	"issue_day" integer NOT NULL,
	"due_day" integer NOT NULL,
	"grace_days" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"last_generated_period" varchar(20),
	"last_generated_at" timestamp,
	"next_generation_date" date,
	"created_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_by" uuid,
	"updated_at" timestamp DEFAULT now(),
	"update_reason" text
);
--> statement-breakpoint
CREATE TABLE "quotas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"unit_id" uuid NOT NULL,
	"payment_concept_id" uuid NOT NULL,
	"period_year" integer NOT NULL,
	"period_month" integer,
	"period_description" varchar(100),
	"base_amount" numeric(15, 2) NOT NULL,
	"currency_id" uuid NOT NULL,
	"interest_amount" numeric(15, 2) DEFAULT '0',
	"amount_in_base_currency" numeric(15, 2),
	"exchange_rate_used" numeric(20, 8),
	"issue_date" date NOT NULL,
	"due_date" date NOT NULL,
	"status" "quota_status" DEFAULT 'pending',
	"paid_amount" numeric(15, 2) DEFAULT '0',
	"balance" numeric(15, 2) NOT NULL,
	"notes" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"created_by" uuid
);
--> statement-breakpoint
CREATE TABLE "role_permissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"role_id" uuid NOT NULL,
	"permission_id" uuid NOT NULL,
	"registered_by" uuid,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"is_system_role" boolean DEFAULT false,
	"registered_by" uuid,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "roles_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "unit_ownerships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"unit_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"ownership_type" "ownership_type" NOT NULL,
	"ownership_percentage" numeric(5, 2),
	"title_deed_number" varchar(100),
	"title_deed_date" date,
	"start_date" date NOT NULL,
	"end_date" date,
	"is_active" boolean DEFAULT true,
	"is_primary_residence" boolean DEFAULT false,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "units" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"building_id" uuid NOT NULL,
	"unit_number" varchar(50) NOT NULL,
	"floor" integer,
	"area_m2" numeric(10, 2),
	"bedrooms" integer,
	"bathrooms" integer,
	"parking_spaces" integer DEFAULT 0,
	"parking_identifiers" text[],
	"storage_identifier" varchar(50),
	"aliquot_percentage" numeric(10, 6),
	"is_active" boolean DEFAULT true,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"created_by" uuid
);
--> statement-breakpoint
CREATE TABLE "user_roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"role_id" uuid NOT NULL,
	"condominium_id" uuid,
	"building_id" uuid,
	"assigned_at" timestamp DEFAULT now(),
	"assigned_by" uuid,
	"registered_by" uuid,
	"expires_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"firebase_uid" varchar(128) NOT NULL,
	"email" varchar(255) NOT NULL,
	"display_name" varchar(255),
	"phone_number" varchar(50),
	"photo_url" text,
	"first_name" varchar(100),
	"last_name" varchar(100),
	"id_document_type" varchar(50),
	"id_document_number" varchar(50),
	"address" varchar(500),
	"location_id" uuid,
	"preferred_language" varchar(10) DEFAULT 'es',
	"preferred_currency_id" uuid,
	"is_active" boolean DEFAULT true,
	"is_email_verified" boolean DEFAULT false,
	"last_login" timestamp,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_firebase_uid_unique" UNIQUE("firebase_uid"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "buildings" ADD CONSTRAINT "buildings_condominium_id_condominiums_id_fk" FOREIGN KEY ("condominium_id") REFERENCES "public"."condominiums"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "buildings" ADD CONSTRAINT "buildings_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "condominiums" ADD CONSTRAINT "condominiums_management_company_id_management_companies_id_fk" FOREIGN KEY ("management_company_id") REFERENCES "public"."management_companies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "condominiums" ADD CONSTRAINT "condominiums_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "condominiums" ADD CONSTRAINT "condominiums_default_currency_id_currencies_id_fk" FOREIGN KEY ("default_currency_id") REFERENCES "public"."currencies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "condominiums" ADD CONSTRAINT "condominiums_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_condominium_id_condominiums_id_fk" FOREIGN KEY ("condominium_id") REFERENCES "public"."condominiums"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_building_id_buildings_id_fk" FOREIGN KEY ("building_id") REFERENCES "public"."buildings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_unit_id_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."units"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_quota_id_quotas_id_fk" FOREIGN KEY ("quota_id") REFERENCES "public"."quotas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_expense_id_expenses_id_fk" FOREIGN KEY ("expense_id") REFERENCES "public"."expenses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entity_payment_gateways" ADD CONSTRAINT "entity_payment_gateways_payment_gateway_id_payment_gateways_id_fk" FOREIGN KEY ("payment_gateway_id") REFERENCES "public"."payment_gateways"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entity_payment_gateways" ADD CONSTRAINT "entity_payment_gateways_condominium_id_condominiums_id_fk" FOREIGN KEY ("condominium_id") REFERENCES "public"."condominiums"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entity_payment_gateways" ADD CONSTRAINT "entity_payment_gateways_building_id_buildings_id_fk" FOREIGN KEY ("building_id") REFERENCES "public"."buildings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entity_payment_gateways" ADD CONSTRAINT "entity_payment_gateways_registered_by_users_id_fk" FOREIGN KEY ("registered_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exchange_rates" ADD CONSTRAINT "exchange_rates_from_currency_id_currencies_id_fk" FOREIGN KEY ("from_currency_id") REFERENCES "public"."currencies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exchange_rates" ADD CONSTRAINT "exchange_rates_to_currency_id_currencies_id_fk" FOREIGN KEY ("to_currency_id") REFERENCES "public"."currencies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense_categories" ADD CONSTRAINT "expense_categories_registered_by_users_id_fk" FOREIGN KEY ("registered_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense_categories" ADD CONSTRAINT "fk_expense_categories_parent" FOREIGN KEY ("parent_category_id") REFERENCES "public"."expense_categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_condominium_id_condominiums_id_fk" FOREIGN KEY ("condominium_id") REFERENCES "public"."condominiums"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_building_id_buildings_id_fk" FOREIGN KEY ("building_id") REFERENCES "public"."buildings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_expense_category_id_expense_categories_id_fk" FOREIGN KEY ("expense_category_id") REFERENCES "public"."expense_categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_currency_id_currencies_id_fk" FOREIGN KEY ("currency_id") REFERENCES "public"."currencies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interest_configurations" ADD CONSTRAINT "interest_configurations_condominium_id_condominiums_id_fk" FOREIGN KEY ("condominium_id") REFERENCES "public"."condominiums"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interest_configurations" ADD CONSTRAINT "interest_configurations_building_id_buildings_id_fk" FOREIGN KEY ("building_id") REFERENCES "public"."buildings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interest_configurations" ADD CONSTRAINT "interest_configurations_payment_concept_id_payment_concepts_id_fk" FOREIGN KEY ("payment_concept_id") REFERENCES "public"."payment_concepts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interest_configurations" ADD CONSTRAINT "interest_configurations_currency_id_currencies_id_fk" FOREIGN KEY ("currency_id") REFERENCES "public"."currencies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interest_configurations" ADD CONSTRAINT "interest_configurations_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "locations" ADD CONSTRAINT "fk_locations_parent" FOREIGN KEY ("parent_id") REFERENCES "public"."locations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "management_companies" ADD CONSTRAINT "management_companies_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "management_companies" ADD CONSTRAINT "management_companies_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_recipient_user_id_users_id_fk" FOREIGN KEY ("recipient_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_recipient_condominium_id_condominiums_id_fk" FOREIGN KEY ("recipient_condominium_id") REFERENCES "public"."condominiums"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_recipient_building_id_buildings_id_fk" FOREIGN KEY ("recipient_building_id") REFERENCES "public"."buildings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_recipient_unit_id_units_id_fk" FOREIGN KEY ("recipient_unit_id") REFERENCES "public"."units"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_registered_by_users_id_fk" FOREIGN KEY ("registered_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_applications" ADD CONSTRAINT "payment_applications_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_applications" ADD CONSTRAINT "payment_applications_quota_id_quotas_id_fk" FOREIGN KEY ("quota_id") REFERENCES "public"."quotas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_applications" ADD CONSTRAINT "payment_applications_registered_by_users_id_fk" FOREIGN KEY ("registered_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_concepts" ADD CONSTRAINT "payment_concepts_condominium_id_condominiums_id_fk" FOREIGN KEY ("condominium_id") REFERENCES "public"."condominiums"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_concepts" ADD CONSTRAINT "payment_concepts_building_id_buildings_id_fk" FOREIGN KEY ("building_id") REFERENCES "public"."buildings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_concepts" ADD CONSTRAINT "payment_concepts_currency_id_currencies_id_fk" FOREIGN KEY ("currency_id") REFERENCES "public"."currencies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_concepts" ADD CONSTRAINT "payment_concepts_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_gateways" ADD CONSTRAINT "payment_gateways_registered_by_users_id_fk" FOREIGN KEY ("registered_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_pending_allocations" ADD CONSTRAINT "payment_pending_allocations_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_pending_allocations" ADD CONSTRAINT "payment_pending_allocations_currency_id_currencies_id_fk" FOREIGN KEY ("currency_id") REFERENCES "public"."currencies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_pending_allocations" ADD CONSTRAINT "payment_pending_allocations_allocated_to_quota_id_quotas_id_fk" FOREIGN KEY ("allocated_to_quota_id") REFERENCES "public"."quotas"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_pending_allocations" ADD CONSTRAINT "payment_pending_allocations_allocated_by_users_id_fk" FOREIGN KEY ("allocated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_unit_id_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."units"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_currency_id_currencies_id_fk" FOREIGN KEY ("currency_id") REFERENCES "public"."currencies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_paid_currency_id_currencies_id_fk" FOREIGN KEY ("paid_currency_id") REFERENCES "public"."currencies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_payment_gateway_id_payment_gateways_id_fk" FOREIGN KEY ("payment_gateway_id") REFERENCES "public"."payment_gateways"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_registered_by_users_id_fk" FOREIGN KEY ("registered_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_verified_by_users_id_fk" FOREIGN KEY ("verified_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "permissions" ADD CONSTRAINT "permissions_registered_by_users_id_fk" FOREIGN KEY ("registered_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quota_adjustments" ADD CONSTRAINT "quota_adjustments_quota_id_quotas_id_fk" FOREIGN KEY ("quota_id") REFERENCES "public"."quotas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quota_adjustments" ADD CONSTRAINT "quota_adjustments_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quota_formulas" ADD CONSTRAINT "quota_formulas_condominium_id_condominiums_id_fk" FOREIGN KEY ("condominium_id") REFERENCES "public"."condominiums"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quota_formulas" ADD CONSTRAINT "quota_formulas_currency_id_currencies_id_fk" FOREIGN KEY ("currency_id") REFERENCES "public"."currencies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quota_formulas" ADD CONSTRAINT "quota_formulas_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quota_formulas" ADD CONSTRAINT "quota_formulas_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quota_generation_logs" ADD CONSTRAINT "quota_generation_logs_generation_rule_id_quota_generation_rules_id_fk" FOREIGN KEY ("generation_rule_id") REFERENCES "public"."quota_generation_rules"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quota_generation_logs" ADD CONSTRAINT "quota_generation_logs_generation_schedule_id_quota_generation_schedules_id_fk" FOREIGN KEY ("generation_schedule_id") REFERENCES "public"."quota_generation_schedules"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quota_generation_logs" ADD CONSTRAINT "quota_generation_logs_quota_formula_id_quota_formulas_id_fk" FOREIGN KEY ("quota_formula_id") REFERENCES "public"."quota_formulas"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quota_generation_logs" ADD CONSTRAINT "quota_generation_logs_currency_id_currencies_id_fk" FOREIGN KEY ("currency_id") REFERENCES "public"."currencies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quota_generation_logs" ADD CONSTRAINT "quota_generation_logs_generated_by_users_id_fk" FOREIGN KEY ("generated_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quota_generation_rules" ADD CONSTRAINT "quota_generation_rules_condominium_id_condominiums_id_fk" FOREIGN KEY ("condominium_id") REFERENCES "public"."condominiums"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quota_generation_rules" ADD CONSTRAINT "quota_generation_rules_building_id_buildings_id_fk" FOREIGN KEY ("building_id") REFERENCES "public"."buildings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quota_generation_rules" ADD CONSTRAINT "quota_generation_rules_payment_concept_id_payment_concepts_id_fk" FOREIGN KEY ("payment_concept_id") REFERENCES "public"."payment_concepts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quota_generation_rules" ADD CONSTRAINT "quota_generation_rules_quota_formula_id_quota_formulas_id_fk" FOREIGN KEY ("quota_formula_id") REFERENCES "public"."quota_formulas"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quota_generation_rules" ADD CONSTRAINT "quota_generation_rules_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quota_generation_rules" ADD CONSTRAINT "quota_generation_rules_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quota_generation_schedules" ADD CONSTRAINT "quota_generation_schedules_quota_generation_rule_id_quota_generation_rules_id_fk" FOREIGN KEY ("quota_generation_rule_id") REFERENCES "public"."quota_generation_rules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quota_generation_schedules" ADD CONSTRAINT "quota_generation_schedules_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quota_generation_schedules" ADD CONSTRAINT "quota_generation_schedules_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotas" ADD CONSTRAINT "quotas_unit_id_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."units"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotas" ADD CONSTRAINT "quotas_payment_concept_id_payment_concepts_id_fk" FOREIGN KEY ("payment_concept_id") REFERENCES "public"."payment_concepts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotas" ADD CONSTRAINT "quotas_currency_id_currencies_id_fk" FOREIGN KEY ("currency_id") REFERENCES "public"."currencies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotas" ADD CONSTRAINT "quotas_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_permissions_id_fk" FOREIGN KEY ("permission_id") REFERENCES "public"."permissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_registered_by_users_id_fk" FOREIGN KEY ("registered_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roles" ADD CONSTRAINT "roles_registered_by_users_id_fk" FOREIGN KEY ("registered_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unit_ownerships" ADD CONSTRAINT "unit_ownerships_unit_id_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."units"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unit_ownerships" ADD CONSTRAINT "unit_ownerships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "units" ADD CONSTRAINT "units_building_id_buildings_id_fk" FOREIGN KEY ("building_id") REFERENCES "public"."buildings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "units" ADD CONSTRAINT "units_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_condominium_id_condominiums_id_fk" FOREIGN KEY ("condominium_id") REFERENCES "public"."condominiums"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_building_id_buildings_id_fk" FOREIGN KEY ("building_id") REFERENCES "public"."buildings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_assigned_by_users_id_fk" FOREIGN KEY ("assigned_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_registered_by_users_id_fk" FOREIGN KEY ("registered_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "fk_users_location" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "fk_users_preferred_currency" FOREIGN KEY ("preferred_currency_id") REFERENCES "public"."currencies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_audit_logs_table" ON "audit_logs" USING btree ("table_name");--> statement-breakpoint
CREATE INDEX "idx_audit_logs_record" ON "audit_logs" USING btree ("record_id");--> statement-breakpoint
CREATE INDEX "idx_audit_logs_user" ON "audit_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_audit_logs_action" ON "audit_logs" USING btree ("action");--> statement-breakpoint
CREATE INDEX "idx_audit_logs_created" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_buildings_condominium" ON "buildings" USING btree ("condominium_id");--> statement-breakpoint
CREATE INDEX "idx_buildings_name" ON "buildings" USING btree ("name");--> statement-breakpoint
CREATE INDEX "idx_buildings_active" ON "buildings" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_buildings_created_by" ON "buildings" USING btree ("created_by");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_buildings_code_unique" ON "buildings" USING btree ("condominium_id","code");--> statement-breakpoint
CREATE INDEX "idx_condominiums_name" ON "condominiums" USING btree ("name");--> statement-breakpoint
CREATE INDEX "idx_condominiums_code" ON "condominiums" USING btree ("code");--> statement-breakpoint
CREATE INDEX "idx_condominiums_management_company" ON "condominiums" USING btree ("management_company_id");--> statement-breakpoint
CREATE INDEX "idx_condominiums_location" ON "condominiums" USING btree ("location_id");--> statement-breakpoint
CREATE INDEX "idx_condominiums_active" ON "condominiums" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_condominiums_created_by" ON "condominiums" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "idx_currencies_code" ON "currencies" USING btree ("code");--> statement-breakpoint
CREATE INDEX "idx_currencies_active" ON "currencies" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_currencies_registered_by" ON "currencies" USING btree ("registered_by");--> statement-breakpoint
CREATE INDEX "idx_documents_type" ON "documents" USING btree ("document_type");--> statement-breakpoint
CREATE INDEX "idx_documents_condominium" ON "documents" USING btree ("condominium_id");--> statement-breakpoint
CREATE INDEX "idx_documents_building" ON "documents" USING btree ("building_id");--> statement-breakpoint
CREATE INDEX "idx_documents_unit" ON "documents" USING btree ("unit_id");--> statement-breakpoint
CREATE INDEX "idx_documents_payment" ON "documents" USING btree ("payment_id");--> statement-breakpoint
CREATE INDEX "idx_documents_user" ON "documents" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_documents_date" ON "documents" USING btree ("document_date");--> statement-breakpoint
CREATE INDEX "idx_documents_created_by" ON "documents" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "idx_entity_gateways_gateway" ON "entity_payment_gateways" USING btree ("payment_gateway_id");--> statement-breakpoint
CREATE INDEX "idx_entity_gateways_condominium" ON "entity_payment_gateways" USING btree ("condominium_id");--> statement-breakpoint
CREATE INDEX "idx_entity_gateways_building" ON "entity_payment_gateways" USING btree ("building_id");--> statement-breakpoint
CREATE INDEX "idx_entity_gateways_registered_by" ON "entity_payment_gateways" USING btree ("registered_by");--> statement-breakpoint
CREATE INDEX "idx_exchange_rates_from" ON "exchange_rates" USING btree ("from_currency_id");--> statement-breakpoint
CREATE INDEX "idx_exchange_rates_to" ON "exchange_rates" USING btree ("to_currency_id");--> statement-breakpoint
CREATE INDEX "idx_exchange_rates_date" ON "exchange_rates" USING btree ("effective_date");--> statement-breakpoint
CREATE INDEX "idx_exchange_rates_created_by" ON "exchange_rates" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "idx_exchange_rates_registered_by" ON "exchange_rates" USING btree ("registered_by");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_exchange_rates_unique" ON "exchange_rates" USING btree ("from_currency_id","to_currency_id","effective_date");--> statement-breakpoint
CREATE INDEX "idx_expense_categories_parent" ON "expense_categories" USING btree ("parent_category_id");--> statement-breakpoint
CREATE INDEX "idx_expense_categories_active" ON "expense_categories" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_expense_categories_registered_by" ON "expense_categories" USING btree ("registered_by");--> statement-breakpoint
CREATE INDEX "idx_expenses_condominium" ON "expenses" USING btree ("condominium_id");--> statement-breakpoint
CREATE INDEX "idx_expenses_building" ON "expenses" USING btree ("building_id");--> statement-breakpoint
CREATE INDEX "idx_expenses_category" ON "expenses" USING btree ("expense_category_id");--> statement-breakpoint
CREATE INDEX "idx_expenses_date" ON "expenses" USING btree ("expense_date");--> statement-breakpoint
CREATE INDEX "idx_expenses_status" ON "expenses" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_expenses_created_by" ON "expenses" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "idx_interest_configs_condominium" ON "interest_configurations" USING btree ("condominium_id");--> statement-breakpoint
CREATE INDEX "idx_interest_configs_building" ON "interest_configurations" USING btree ("building_id");--> statement-breakpoint
CREATE INDEX "idx_interest_configs_concept" ON "interest_configurations" USING btree ("payment_concept_id");--> statement-breakpoint
CREATE INDEX "idx_interest_configs_active" ON "interest_configurations" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_interest_configs_dates" ON "interest_configurations" USING btree ("effective_from","effective_to");--> statement-breakpoint
CREATE INDEX "idx_interest_configs_created_by" ON "interest_configurations" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "idx_locations_type" ON "locations" USING btree ("location_type");--> statement-breakpoint
CREATE INDEX "idx_locations_parent" ON "locations" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "idx_locations_code" ON "locations" USING btree ("code");--> statement-breakpoint
CREATE INDEX "idx_locations_name" ON "locations" USING btree ("name");--> statement-breakpoint
CREATE INDEX "idx_locations_active" ON "locations" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_locations_registered_by" ON "locations" USING btree ("registered_by");--> statement-breakpoint
CREATE INDEX "idx_management_companies_name" ON "management_companies" USING btree ("name");--> statement-breakpoint
CREATE INDEX "idx_management_companies_tax_id" ON "management_companies" USING btree ("tax_id");--> statement-breakpoint
CREATE INDEX "idx_management_companies_active" ON "management_companies" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_management_companies_created_by" ON "management_companies" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "idx_messages_sender" ON "messages" USING btree ("sender_id");--> statement-breakpoint
CREATE INDEX "idx_messages_recipient_user" ON "messages" USING btree ("recipient_user_id");--> statement-breakpoint
CREATE INDEX "idx_messages_recipient_condominium" ON "messages" USING btree ("recipient_condominium_id");--> statement-breakpoint
CREATE INDEX "idx_messages_recipient_building" ON "messages" USING btree ("recipient_building_id");--> statement-breakpoint
CREATE INDEX "idx_messages_recipient_unit" ON "messages" USING btree ("recipient_unit_id");--> statement-breakpoint
CREATE INDEX "idx_messages_type" ON "messages" USING btree ("message_type");--> statement-breakpoint
CREATE INDEX "idx_messages_read" ON "messages" USING btree ("is_read");--> statement-breakpoint
CREATE INDEX "idx_messages_sent" ON "messages" USING btree ("sent_at");--> statement-breakpoint
CREATE INDEX "idx_messages_registered_by" ON "messages" USING btree ("registered_by");--> statement-breakpoint
CREATE INDEX "idx_payment_applications_payment" ON "payment_applications" USING btree ("payment_id");--> statement-breakpoint
CREATE INDEX "idx_payment_applications_quota" ON "payment_applications" USING btree ("quota_id");--> statement-breakpoint
CREATE INDEX "idx_payment_applications_registered_by" ON "payment_applications" USING btree ("registered_by");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_payment_applications_unique" ON "payment_applications" USING btree ("payment_id","quota_id");--> statement-breakpoint
CREATE INDEX "idx_payment_concepts_condominium" ON "payment_concepts" USING btree ("condominium_id");--> statement-breakpoint
CREATE INDEX "idx_payment_concepts_building" ON "payment_concepts" USING btree ("building_id");--> statement-breakpoint
CREATE INDEX "idx_payment_concepts_type" ON "payment_concepts" USING btree ("concept_type");--> statement-breakpoint
CREATE INDEX "idx_payment_concepts_active" ON "payment_concepts" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_payment_concepts_created_by" ON "payment_concepts" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "idx_payment_gateways_type" ON "payment_gateways" USING btree ("gateway_type");--> statement-breakpoint
CREATE INDEX "idx_payment_gateways_active" ON "payment_gateways" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_payment_gateways_registered_by" ON "payment_gateways" USING btree ("registered_by");--> statement-breakpoint
CREATE INDEX "idx_payment_pending_alloc_payment" ON "payment_pending_allocations" USING btree ("payment_id");--> statement-breakpoint
CREATE INDEX "idx_payment_pending_alloc_status" ON "payment_pending_allocations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_payment_pending_alloc_quota" ON "payment_pending_allocations" USING btree ("allocated_to_quota_id");--> statement-breakpoint
CREATE INDEX "idx_payment_pending_alloc_allocated_by" ON "payment_pending_allocations" USING btree ("allocated_by");--> statement-breakpoint
CREATE INDEX "idx_payments_user" ON "payments" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_payments_unit" ON "payments" USING btree ("unit_id");--> statement-breakpoint
CREATE INDEX "idx_payments_date" ON "payments" USING btree ("payment_date");--> statement-breakpoint
CREATE INDEX "idx_payments_status" ON "payments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_payments_number" ON "payments" USING btree ("payment_number");--> statement-breakpoint
CREATE INDEX "idx_payments_gateway" ON "payments" USING btree ("payment_gateway_id");--> statement-breakpoint
CREATE INDEX "idx_payments_currency" ON "payments" USING btree ("currency_id");--> statement-breakpoint
CREATE INDEX "idx_payments_registered_by" ON "payments" USING btree ("registered_by");--> statement-breakpoint
CREATE INDEX "idx_payments_verified_by" ON "payments" USING btree ("verified_by");--> statement-breakpoint
CREATE INDEX "idx_permissions_module" ON "permissions" USING btree ("module");--> statement-breakpoint
CREATE INDEX "idx_permissions_registered_by" ON "permissions" USING btree ("registered_by");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_permissions_module_action" ON "permissions" USING btree ("module","action");--> statement-breakpoint
CREATE INDEX "idx_quota_adjustments_quota" ON "quota_adjustments" USING btree ("quota_id");--> statement-breakpoint
CREATE INDEX "idx_quota_adjustments_created_by" ON "quota_adjustments" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "idx_quota_adjustments_type" ON "quota_adjustments" USING btree ("adjustment_type");--> statement-breakpoint
CREATE INDEX "idx_quota_formulas_condominium" ON "quota_formulas" USING btree ("condominium_id");--> statement-breakpoint
CREATE INDEX "idx_quota_formulas_type" ON "quota_formulas" USING btree ("formula_type");--> statement-breakpoint
CREATE INDEX "idx_quota_formulas_active" ON "quota_formulas" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_quota_formulas_created_by" ON "quota_formulas" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "idx_quota_gen_logs_rule" ON "quota_generation_logs" USING btree ("generation_rule_id");--> statement-breakpoint
CREATE INDEX "idx_quota_gen_logs_schedule" ON "quota_generation_logs" USING btree ("generation_schedule_id");--> statement-breakpoint
CREATE INDEX "idx_quota_gen_logs_formula" ON "quota_generation_logs" USING btree ("quota_formula_id");--> statement-breakpoint
CREATE INDEX "idx_quota_gen_logs_method" ON "quota_generation_logs" USING btree ("generation_method");--> statement-breakpoint
CREATE INDEX "idx_quota_gen_logs_period" ON "quota_generation_logs" USING btree ("period_year","period_month");--> statement-breakpoint
CREATE INDEX "idx_quota_gen_logs_status" ON "quota_generation_logs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_quota_gen_logs_generated_by" ON "quota_generation_logs" USING btree ("generated_by");--> statement-breakpoint
CREATE INDEX "idx_quota_gen_logs_generated_at" ON "quota_generation_logs" USING btree ("generated_at");--> statement-breakpoint
CREATE INDEX "idx_quota_gen_rules_condominium" ON "quota_generation_rules" USING btree ("condominium_id");--> statement-breakpoint
CREATE INDEX "idx_quota_gen_rules_building" ON "quota_generation_rules" USING btree ("building_id");--> statement-breakpoint
CREATE INDEX "idx_quota_gen_rules_concept" ON "quota_generation_rules" USING btree ("payment_concept_id");--> statement-breakpoint
CREATE INDEX "idx_quota_gen_rules_formula" ON "quota_generation_rules" USING btree ("quota_formula_id");--> statement-breakpoint
CREATE INDEX "idx_quota_gen_rules_dates" ON "quota_generation_rules" USING btree ("effective_from","effective_to");--> statement-breakpoint
CREATE INDEX "idx_quota_gen_rules_active" ON "quota_generation_rules" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_quota_gen_rules_created_by" ON "quota_generation_rules" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "idx_quota_gen_schedules_rule" ON "quota_generation_schedules" USING btree ("quota_generation_rule_id");--> statement-breakpoint
CREATE INDEX "idx_quota_gen_schedules_frequency" ON "quota_generation_schedules" USING btree ("frequency_type");--> statement-breakpoint
CREATE INDEX "idx_quota_gen_schedules_active" ON "quota_generation_schedules" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_quota_gen_schedules_next" ON "quota_generation_schedules" USING btree ("next_generation_date");--> statement-breakpoint
CREATE INDEX "idx_quota_gen_schedules_created_by" ON "quota_generation_schedules" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "idx_quotas_unit" ON "quotas" USING btree ("unit_id");--> statement-breakpoint
CREATE INDEX "idx_quotas_concept" ON "quotas" USING btree ("payment_concept_id");--> statement-breakpoint
CREATE INDEX "idx_quotas_period" ON "quotas" USING btree ("period_year","period_month");--> statement-breakpoint
CREATE INDEX "idx_quotas_status" ON "quotas" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_quotas_due_date" ON "quotas" USING btree ("due_date");--> statement-breakpoint
CREATE INDEX "idx_quotas_currency" ON "quotas" USING btree ("currency_id");--> statement-breakpoint
CREATE INDEX "idx_quotas_created_by" ON "quotas" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "idx_role_permissions_role" ON "role_permissions" USING btree ("role_id");--> statement-breakpoint
CREATE INDEX "idx_role_permissions_permission" ON "role_permissions" USING btree ("permission_id");--> statement-breakpoint
CREATE INDEX "idx_role_permissions_registered_by" ON "role_permissions" USING btree ("registered_by");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_role_permissions_unique" ON "role_permissions" USING btree ("role_id","permission_id");--> statement-breakpoint
CREATE INDEX "idx_roles_name" ON "roles" USING btree ("name");--> statement-breakpoint
CREATE INDEX "idx_roles_system" ON "roles" USING btree ("is_system_role");--> statement-breakpoint
CREATE INDEX "idx_roles_registered_by" ON "roles" USING btree ("registered_by");--> statement-breakpoint
CREATE INDEX "idx_unit_ownerships_unit" ON "unit_ownerships" USING btree ("unit_id");--> statement-breakpoint
CREATE INDEX "idx_unit_ownerships_user" ON "unit_ownerships" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_unit_ownerships_type" ON "unit_ownerships" USING btree ("ownership_type");--> statement-breakpoint
CREATE INDEX "idx_unit_ownerships_active" ON "unit_ownerships" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_units_building" ON "units" USING btree ("building_id");--> statement-breakpoint
CREATE INDEX "idx_units_number" ON "units" USING btree ("unit_number");--> statement-breakpoint
CREATE INDEX "idx_units_active" ON "units" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_units_created_by" ON "units" USING btree ("created_by");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_units_unique" ON "units" USING btree ("building_id","unit_number");--> statement-breakpoint
CREATE INDEX "idx_user_roles_user" ON "user_roles" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_user_roles_role" ON "user_roles" USING btree ("role_id");--> statement-breakpoint
CREATE INDEX "idx_user_roles_condominium" ON "user_roles" USING btree ("condominium_id");--> statement-breakpoint
CREATE INDEX "idx_user_roles_building" ON "user_roles" USING btree ("building_id");--> statement-breakpoint
CREATE INDEX "idx_user_roles_assigned_by" ON "user_roles" USING btree ("assigned_by");--> statement-breakpoint
CREATE INDEX "idx_user_roles_registered_by" ON "user_roles" USING btree ("registered_by");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_user_roles_unique" ON "user_roles" USING btree ("user_id","role_id","condominium_id","building_id");--> statement-breakpoint
CREATE INDEX "idx_users_firebase_uid" ON "users" USING btree ("firebase_uid");--> statement-breakpoint
CREATE INDEX "idx_users_email" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "idx_users_location" ON "users" USING btree ("location_id");--> statement-breakpoint
CREATE INDEX "idx_users_active" ON "users" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_users_id_document" ON "users" USING btree ("id_document_number");