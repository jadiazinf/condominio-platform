CREATE TABLE "gateway_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payment_id" uuid NOT NULL,
	"gateway_type" "gateway_type" NOT NULL,
	"external_transaction_id" varchar(255),
	"external_reference" varchar(255),
	"request_payload" jsonb,
	"response_payload" jsonb,
	"status" varchar(50) DEFAULT 'initiated' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer DEFAULT 10 NOT NULL,
	"last_attempt_at" timestamp,
	"verified_at" timestamp,
	"error_message" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "gateway_transactions" ADD CONSTRAINT "gateway_transactions_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_gateway_tx_payment" ON "gateway_transactions" USING btree ("payment_id");--> statement-breakpoint
CREATE INDEX "idx_gateway_tx_external_id" ON "gateway_transactions" USING btree ("external_transaction_id");--> statement-breakpoint
CREATE INDEX "idx_gateway_tx_external_ref" ON "gateway_transactions" USING btree ("external_reference");--> statement-breakpoint
CREATE INDEX "idx_gateway_tx_status" ON "gateway_transactions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_gateway_tx_type" ON "gateway_transactions" USING btree ("gateway_type");