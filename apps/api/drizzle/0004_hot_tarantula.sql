ALTER TYPE "public"."adjustment_type" ADD VALUE 'exoneration';--> statement-breakpoint
ALTER TYPE "public"."adjustment_type" ADD VALUE 'credit_note';--> statement-breakpoint
ALTER TYPE "public"."quota_status" ADD VALUE 'exonerated';--> statement-breakpoint
CREATE TABLE "payment_concept_changes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payment_concept_id" uuid NOT NULL,
	"condominium_id" uuid NOT NULL,
	"changed_by" uuid NOT NULL,
	"previous_values" jsonb NOT NULL,
	"new_values" jsonb NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "payment_concept_changes" ADD CONSTRAINT "payment_concept_changes_payment_concept_id_payment_concepts_id_fk" FOREIGN KEY ("payment_concept_id") REFERENCES "public"."payment_concepts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_concept_changes" ADD CONSTRAINT "payment_concept_changes_condominium_id_condominiums_id_fk" FOREIGN KEY ("condominium_id") REFERENCES "public"."condominiums"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_concept_changes" ADD CONSTRAINT "payment_concept_changes_changed_by_users_id_fk" FOREIGN KEY ("changed_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_pcc_concept" ON "payment_concept_changes" USING btree ("payment_concept_id");--> statement-breakpoint
CREATE INDEX "idx_pcc_condominium" ON "payment_concept_changes" USING btree ("condominium_id");--> statement-breakpoint
CREATE INDEX "idx_pcc_changed_by" ON "payment_concept_changes" USING btree ("changed_by");