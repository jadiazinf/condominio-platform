-- Add new allocation status values for bank refund lifecycle
ALTER TYPE "allocation_status" ADD VALUE IF NOT EXISTS 'refund_pending';
ALTER TYPE "allocation_status" ADD VALUE IF NOT EXISTS 'refund_failed';
