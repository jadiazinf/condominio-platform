-- Migration: Add Support Tickets System
-- Description: Creates tables for support ticket management system

-- ============================================================================
-- Enums
-- ============================================================================

-- Ticket priority levels
CREATE TYPE "ticket_priority" AS ENUM('low', 'medium', 'high', 'urgent');

-- Ticket status values
CREATE TYPE "ticket_status" AS ENUM(
  'open',
  'in_progress',
  'waiting_customer',
  'resolved',
  'closed',
  'cancelled'
);

-- Ticket categories
CREATE TYPE "ticket_category" AS ENUM(
  'technical',
  'billing',
  'feature_request',
  'general',
  'bug'
);

-- ============================================================================
-- Tables
-- ============================================================================

-- Support Tickets Table
CREATE TABLE IF NOT EXISTS "support_tickets" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "ticket_number" varchar(50) UNIQUE NOT NULL,
  "management_company_id" uuid NOT NULL REFERENCES "management_companies"("id") ON DELETE CASCADE,
  "created_by_user_id" uuid NOT NULL REFERENCES "users"("id"),
  "created_by_member_id" uuid REFERENCES "management_company_members"("id"),

  -- Ticket information
  "subject" varchar(255) NOT NULL,
  "description" text NOT NULL,
  "priority" ticket_priority NOT NULL DEFAULT 'medium',
  "status" ticket_status NOT NULL DEFAULT 'open',
  "category" ticket_category,

  -- Assignment (superadmin/support agent)
  "assigned_to" uuid REFERENCES "users"("id"),
  "assigned_at" timestamp,

  -- Tracking
  "resolved_at" timestamp,
  "resolved_by" uuid REFERENCES "users"("id"),
  "closed_at" timestamp,
  "closed_by" uuid REFERENCES "users"("id"),

  -- Metadata
  "metadata" jsonb,
  "tags" varchar(50)[],

  -- Timestamps
  "created_at" timestamp DEFAULT NOW() NOT NULL,
  "updated_at" timestamp DEFAULT NOW() NOT NULL
);

-- Support Ticket Messages Table
CREATE TABLE IF NOT EXISTS "support_ticket_messages" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "ticket_id" uuid NOT NULL REFERENCES "support_tickets"("id") ON DELETE CASCADE,
  "user_id" uuid NOT NULL REFERENCES "users"("id"),

  -- Message content
  "message" text NOT NULL,
  "is_internal" boolean DEFAULT false NOT NULL,

  -- Attachments
  "attachments" jsonb,

  -- Timestamps
  "created_at" timestamp DEFAULT NOW() NOT NULL,
  "updated_at" timestamp DEFAULT NOW() NOT NULL
);

-- ============================================================================
-- Indexes
-- ============================================================================

-- Support Tickets indexes
CREATE INDEX IF NOT EXISTS "idx_tickets_company" ON "support_tickets"("management_company_id");
CREATE INDEX IF NOT EXISTS "idx_tickets_created_by" ON "support_tickets"("created_by_user_id");
CREATE INDEX IF NOT EXISTS "idx_tickets_status" ON "support_tickets"("status");
CREATE INDEX IF NOT EXISTS "idx_tickets_priority" ON "support_tickets"("priority");
CREATE INDEX IF NOT EXISTS "idx_tickets_assigned_to" ON "support_tickets"("assigned_to");
CREATE INDEX IF NOT EXISTS "idx_tickets_number" ON "support_tickets"("ticket_number");
CREATE INDEX IF NOT EXISTS "idx_tickets_created_at" ON "support_tickets"("created_at");

-- Support Ticket Messages indexes
CREATE INDEX IF NOT EXISTS "idx_ticket_messages_ticket" ON "support_ticket_messages"("ticket_id");
CREATE INDEX IF NOT EXISTS "idx_ticket_messages_user" ON "support_ticket_messages"("user_id");
CREATE INDEX IF NOT EXISTS "idx_ticket_messages_created_at" ON "support_ticket_messages"("created_at");
