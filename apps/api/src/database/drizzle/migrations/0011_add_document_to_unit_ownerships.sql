-- ============================================================================
-- ADD DOCUMENT IDENTITY TO UNIT OWNERSHIPS
-- ============================================================================
-- Adds id_document_type and id_document_number columns to unit_ownerships
-- to store document identity directly on the ownership record.
-- ============================================================================

ALTER TABLE "unit_ownerships" ADD COLUMN "id_document_type" varchar(50);
ALTER TABLE "unit_ownerships" ADD COLUMN "id_document_number" varchar(50);
