CREATE TYPE "public"."bank_statement_entry_status" AS ENUM('unmatched', 'matched', 'ignored');--> statement-breakpoint
CREATE TYPE "public"."bank_statement_entry_type" AS ENUM('credit', 'debit');--> statement-breakpoint
CREATE TYPE "public"."bank_statement_import_status" AS ENUM('processing', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."budget_status" AS ENUM('draft', 'approved', 'active', 'closed');--> statement-breakpoint
CREATE TYPE "public"."budget_type" AS ENUM('monthly', 'quarterly', 'annual');--> statement-breakpoint
CREATE TYPE "public"."match_type" AS ENUM('auto_reference', 'auto_amount_date', 'manual');--> statement-breakpoint
CREATE TYPE "public"."receipt_status" AS ENUM('draft', 'generated', 'sent', 'voided');--> statement-breakpoint
CREATE TYPE "public"."reconciliation_status" AS ENUM('in_progress', 'completed', 'cancelled');--> statement-breakpoint
ALTER TYPE "public"."gateway_type" ADD VALUE 'bnc' BEFORE 'paypal';--> statement-breakpoint
CREATE TABLE "budget_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"budget_id" uuid NOT NULL,
	"expense_category_id" uuid,
	"description" varchar(255) NOT NULL,
	"budgeted_amount" numeric(15, 2) NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "budgets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"condominium_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"budget_type" "budget_type" DEFAULT 'monthly' NOT NULL,
	"period_year" integer NOT NULL,
	"period_month" integer,
	"currency_id" uuid NOT NULL,
	"status" "budget_status" DEFAULT 'draft' NOT NULL,
	"total_amount" numeric(15, 2) DEFAULT '0' NOT NULL,
	"reserve_fund_percentage" numeric(5, 2) DEFAULT '0',
	"approved_by" uuid,
	"approved_at" timestamp,
	"notes" text,
	"metadata" jsonb,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "uq_budgets_condo_period" UNIQUE("condominium_id","budget_type","period_year","period_month")
);
--> statement-breakpoint
CREATE TABLE "condominium_receipts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"condominium_id" uuid NOT NULL,
	"building_id" uuid NOT NULL,
	"unit_id" uuid NOT NULL,
	"budget_id" uuid,
	"currency_id" uuid NOT NULL,
	"period_year" integer NOT NULL,
	"period_month" integer NOT NULL,
	"receipt_number" varchar(50) NOT NULL,
	"status" "receipt_status" DEFAULT 'draft' NOT NULL,
	"ordinary_amount" numeric(15, 2) DEFAULT '0' NOT NULL,
	"extraordinary_amount" numeric(15, 2) DEFAULT '0' NOT NULL,
	"reserve_fund_amount" numeric(15, 2) DEFAULT '0' NOT NULL,
	"interest_amount" numeric(15, 2) DEFAULT '0' NOT NULL,
	"fines_amount" numeric(15, 2) DEFAULT '0' NOT NULL,
	"previous_balance" numeric(15, 2) DEFAULT '0' NOT NULL,
	"total_amount" numeric(15, 2) DEFAULT '0' NOT NULL,
	"unit_aliquot" numeric(8, 5),
	"pdf_url" text,
	"generated_at" timestamp,
	"sent_at" timestamp,
	"voided_at" timestamp,
	"notes" text,
	"metadata" jsonb,
	"generated_by" uuid,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "uq_receipts_unit_period" UNIQUE("unit_id","period_year","period_month")
);
--> statement-breakpoint
CREATE TABLE "bank_statement_imports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bank_account_id" uuid NOT NULL,
	"filename" varchar(255) NOT NULL,
	"imported_by" uuid,
	"period_from" date NOT NULL,
	"period_to" date NOT NULL,
	"total_entries" integer DEFAULT 0,
	"total_credits" numeric(15, 2) DEFAULT '0',
	"total_debits" numeric(15, 2) DEFAULT '0',
	"status" "bank_statement_import_status" DEFAULT 'processing',
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "bank_statement_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"import_id" uuid NOT NULL,
	"transaction_date" date NOT NULL,
	"value_date" date,
	"reference" varchar(255),
	"description" text,
	"amount" numeric(15, 2) NOT NULL,
	"entry_type" "bank_statement_entry_type" NOT NULL,
	"balance" numeric(15, 2),
	"status" "bank_statement_entry_status" DEFAULT 'unmatched',
	"matched_at" timestamp,
	"raw_data" jsonb,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "bank_reconciliations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bank_account_id" uuid NOT NULL,
	"condominium_id" uuid NOT NULL,
	"period_from" date NOT NULL,
	"period_to" date NOT NULL,
	"status" "reconciliation_status" DEFAULT 'in_progress',
	"total_matched" integer DEFAULT 0,
	"total_unmatched" integer DEFAULT 0,
	"total_ignored" integer DEFAULT 0,
	"reconciled_by" uuid,
	"reconciled_at" timestamp,
	"notes" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "bank_statement_matches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entry_id" uuid NOT NULL,
	"payment_id" uuid NOT NULL,
	"match_type" "match_type" NOT NULL,
	"confidence" numeric(5, 2),
	"matched_by" uuid,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "budget_items" ADD CONSTRAINT "budget_items_budget_id_budgets_id_fk" FOREIGN KEY ("budget_id") REFERENCES "public"."budgets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budget_items" ADD CONSTRAINT "budget_items_expense_category_id_expense_categories_id_fk" FOREIGN KEY ("expense_category_id") REFERENCES "public"."expense_categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_condominium_id_condominiums_id_fk" FOREIGN KEY ("condominium_id") REFERENCES "public"."condominiums"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_currency_id_currencies_id_fk" FOREIGN KEY ("currency_id") REFERENCES "public"."currencies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "condominium_receipts" ADD CONSTRAINT "condominium_receipts_condominium_id_condominiums_id_fk" FOREIGN KEY ("condominium_id") REFERENCES "public"."condominiums"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "condominium_receipts" ADD CONSTRAINT "condominium_receipts_building_id_buildings_id_fk" FOREIGN KEY ("building_id") REFERENCES "public"."buildings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "condominium_receipts" ADD CONSTRAINT "condominium_receipts_unit_id_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."units"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "condominium_receipts" ADD CONSTRAINT "condominium_receipts_budget_id_budgets_id_fk" FOREIGN KEY ("budget_id") REFERENCES "public"."budgets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "condominium_receipts" ADD CONSTRAINT "condominium_receipts_currency_id_currencies_id_fk" FOREIGN KEY ("currency_id") REFERENCES "public"."currencies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "condominium_receipts" ADD CONSTRAINT "condominium_receipts_generated_by_users_id_fk" FOREIGN KEY ("generated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_statement_imports" ADD CONSTRAINT "bank_statement_imports_bank_account_id_bank_accounts_id_fk" FOREIGN KEY ("bank_account_id") REFERENCES "public"."bank_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_statement_imports" ADD CONSTRAINT "bank_statement_imports_imported_by_users_id_fk" FOREIGN KEY ("imported_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_statement_entries" ADD CONSTRAINT "bank_statement_entries_import_id_bank_statement_imports_id_fk" FOREIGN KEY ("import_id") REFERENCES "public"."bank_statement_imports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_reconciliations" ADD CONSTRAINT "bank_reconciliations_bank_account_id_bank_accounts_id_fk" FOREIGN KEY ("bank_account_id") REFERENCES "public"."bank_accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_reconciliations" ADD CONSTRAINT "bank_reconciliations_condominium_id_condominiums_id_fk" FOREIGN KEY ("condominium_id") REFERENCES "public"."condominiums"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_reconciliations" ADD CONSTRAINT "bank_reconciliations_reconciled_by_users_id_fk" FOREIGN KEY ("reconciled_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_statement_matches" ADD CONSTRAINT "bank_statement_matches_entry_id_bank_statement_entries_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."bank_statement_entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_statement_matches" ADD CONSTRAINT "bank_statement_matches_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_statement_matches" ADD CONSTRAINT "bank_statement_matches_matched_by_users_id_fk" FOREIGN KEY ("matched_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_budget_items_budget" ON "budget_items" USING btree ("budget_id");--> statement-breakpoint
CREATE INDEX "idx_budget_items_category" ON "budget_items" USING btree ("expense_category_id");--> statement-breakpoint
CREATE INDEX "idx_budgets_condominium" ON "budgets" USING btree ("condominium_id");--> statement-breakpoint
CREATE INDEX "idx_budgets_status" ON "budgets" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_budgets_period" ON "budgets" USING btree ("period_year","period_month");--> statement-breakpoint
CREATE INDEX "idx_receipts_condominium" ON "condominium_receipts" USING btree ("condominium_id");--> statement-breakpoint
CREATE INDEX "idx_receipts_unit" ON "condominium_receipts" USING btree ("unit_id");--> statement-breakpoint
CREATE INDEX "idx_receipts_period" ON "condominium_receipts" USING btree ("period_year","period_month");--> statement-breakpoint
CREATE INDEX "idx_receipts_status" ON "condominium_receipts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_bank_statement_imports_bank_account" ON "bank_statement_imports" USING btree ("bank_account_id");--> statement-breakpoint
CREATE INDEX "idx_bank_statement_imports_status" ON "bank_statement_imports" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_bank_statement_imports_imported_by" ON "bank_statement_imports" USING btree ("imported_by");--> statement-breakpoint
CREATE INDEX "idx_bank_statement_imports_period" ON "bank_statement_imports" USING btree ("period_from","period_to");--> statement-breakpoint
CREATE INDEX "idx_bank_statement_entries_import" ON "bank_statement_entries" USING btree ("import_id");--> statement-breakpoint
CREATE INDEX "idx_bank_statement_entries_date" ON "bank_statement_entries" USING btree ("transaction_date");--> statement-breakpoint
CREATE INDEX "idx_bank_statement_entries_reference" ON "bank_statement_entries" USING btree ("reference");--> statement-breakpoint
CREATE INDEX "idx_bank_statement_entries_status" ON "bank_statement_entries" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_bank_statement_entries_type" ON "bank_statement_entries" USING btree ("entry_type");--> statement-breakpoint
CREATE INDEX "idx_bank_reconciliations_bank_account" ON "bank_reconciliations" USING btree ("bank_account_id");--> statement-breakpoint
CREATE INDEX "idx_bank_reconciliations_condominium" ON "bank_reconciliations" USING btree ("condominium_id");--> statement-breakpoint
CREATE INDEX "idx_bank_reconciliations_status" ON "bank_reconciliations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_bank_reconciliations_period" ON "bank_reconciliations" USING btree ("period_from","period_to");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_bank_statement_matches_entry_unique" ON "bank_statement_matches" USING btree ("entry_id");--> statement-breakpoint
CREATE INDEX "idx_bank_statement_matches_payment" ON "bank_statement_matches" USING btree ("payment_id");--> statement-breakpoint
CREATE INDEX "idx_bank_statement_matches_type" ON "bank_statement_matches" USING btree ("match_type");