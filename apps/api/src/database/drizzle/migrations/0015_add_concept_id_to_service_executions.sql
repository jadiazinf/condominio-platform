ALTER TABLE "service_executions"
  ADD COLUMN "payment_concept_id" uuid REFERENCES "payment_concepts"("id") ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS "idx_service_executions_concept"
  ON "service_executions" ("payment_concept_id");
