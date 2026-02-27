-- Drop the status column and index from service_executions
DROP INDEX IF EXISTS "idx_service_executions_status";
ALTER TABLE "service_executions" DROP COLUMN IF EXISTS "status";

-- Drop the enum type
DROP TYPE IF EXISTS "service_execution_status";
