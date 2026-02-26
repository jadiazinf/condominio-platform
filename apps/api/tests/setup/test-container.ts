import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { sql } from 'drizzle-orm'
import * as schema from '@database/drizzle/schema'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { readFileSync, existsSync } from 'fs'

// Load .env.test file before anything else
const __dirname = dirname(fileURLToPath(import.meta.url))
const envPath = join(__dirname, '../../.env.test')

if (existsSync(envPath)) {
  const content = readFileSync(envPath, 'utf-8')
  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=')
      if (key && valueParts.length > 0) {
        process.env[key.trim()] = valueParts.join('=').trim()
      }
    }
  }
}

export type TTestDrizzleClient = PostgresJsDatabase<typeof schema>

let client: ReturnType<typeof postgres> | null = null
let db: TTestDrizzleClient | null = null
let startPromise: Promise<TTestDrizzleClient> | null = null
let schemaName: string | null = null

// Test database URL - uses local PostgreSQL
function getTestDatabaseUrl(): string {
  const url = process.env.DATABASE_URL
  if (!url) {
    throw new Error(
      'DATABASE_URL environment variable is required. Create a .env.test file with DATABASE_URL=postgresql://...'
    )
  }
  return url
}

const TEST_DATABASE_URL = getTestDatabaseUrl()

/**
 * Starts a connection to the test database.
 * Uses a local PostgreSQL database for faster test execution.
 * Thread-safe: multiple calls will wait for the same connection.
 */
export async function startTestContainer(): Promise<TTestDrizzleClient> {
  // Return existing db if already initialized
  if (db) {
    return db
  }

  // If already starting, wait for that promise
  if (startPromise) {
    return startPromise
  }

  // Start the connection (only once)
  startPromise = (async () => {
    // 1. Generate unique schema name
    schemaName = `test_${crypto.randomUUID().replace(/-/g, '')}`

    // 2. Connect to main DB to create schema
    const adminClient = postgres(TEST_DATABASE_URL, { max: 1, onnotice: () => {} })
    await adminClient`CREATE SCHEMA IF NOT EXISTS ${adminClient.unsafe(schemaName)}`
    await adminClient.end()

    // 3. Connect with search_path
    const url = new URL(TEST_DATABASE_URL)
    url.searchParams.set('search_path', schemaName)

    client = postgres(url.toString(), {
      max: 1,
      idle_timeout: 20,
      connect_timeout: 10,
      prepare: false,
      onnotice: () => {},
    })

    db = drizzle(client, { schema })

    // Create schema if it doesn't exist
    await createSchema(db)

    return db
  })()

  return startPromise
}

/**
 * Creates the database schema for testing.
 * Uses IF NOT EXISTS to be idempotent.
 */
async function createSchema(db: TTestDrizzleClient): Promise<void> {
  const start = performance.now()
  // Create enums and tables in a single transaction block for performance
  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE location_type AS ENUM ('country', 'province', 'city');
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;

    DO $$ BEGIN
      CREATE TYPE ownership_type AS ENUM ('owner', 'co-owner', 'tenant', 'family_member', 'authorized');
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;

    DO $$ BEGIN
      CREATE TYPE concept_type AS ENUM ('maintenance', 'condominium_fee', 'extraordinary', 'fine', 'reserve_fund', 'other');
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;

    DO $$ BEGIN
      CREATE TYPE interest_type AS ENUM ('simple', 'compound', 'fixed_amount');
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;

    DO $$ BEGIN
      CREATE TYPE quota_status AS ENUM ('pending', 'paid', 'overdue', 'cancelled');
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;

    DO $$ BEGIN
      CREATE TYPE gateway_type AS ENUM ('stripe', 'banco_plaza', 'paypal', 'zelle', 'other');
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;

    DO $$ BEGIN
      CREATE TYPE payment_method AS ENUM ('transfer', 'cash', 'card', 'gateway');
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;

    DO $$ BEGIN
      CREATE TYPE payment_status AS ENUM ('pending', 'pending_verification', 'completed', 'failed', 'refunded', 'rejected');
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;

    DO $$ BEGIN
      CREATE TYPE expense_status AS ENUM ('pending', 'approved', 'rejected', 'paid');
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;

    DO $$ BEGIN
      CREATE TYPE document_type AS ENUM ('invoice', 'receipt', 'statement', 'contract', 'regulation', 'minutes', 'other');
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;

    DO $$ BEGIN
      CREATE TYPE recipient_type AS ENUM ('user', 'condominium', 'building', 'unit');
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;

    DO $$ BEGIN
      CREATE TYPE message_type AS ENUM ('message', 'notification', 'announcement');
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;

    DO $$ BEGIN
      CREATE TYPE priority AS ENUM ('low', 'normal', 'high', 'urgent');
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;

    DO $$ BEGIN
      CREATE TYPE audit_action AS ENUM ('INSERT', 'UPDATE', 'DELETE');
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;

    DO $$ BEGIN
      CREATE TYPE adjustment_type AS ENUM ('discount', 'increase', 'correction', 'waiver');
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;

    DO $$ BEGIN
      CREATE TYPE formula_type AS ENUM ('fixed', 'expression', 'per_unit');
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;

    DO $$ BEGIN
      CREATE TYPE frequency_type AS ENUM ('days', 'monthly', 'quarterly', 'semi_annual', 'annual');
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;

    DO $$ BEGIN
      CREATE TYPE generation_method AS ENUM ('manual_single', 'manual_batch', 'scheduled', 'range');
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;

    DO $$ BEGIN
      CREATE TYPE generation_status AS ENUM ('completed', 'partial', 'failed');
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;

    DO $$ BEGIN
      CREATE TYPE allocation_status AS ENUM ('pending', 'allocated', 'refunded');
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;

    DO $$ BEGIN
      CREATE TYPE admin_invitation_status AS ENUM ('pending', 'accepted', 'expired', 'cancelled');
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;

    DO $$ BEGIN
      CREATE TYPE member_role AS ENUM ('admin', 'accountant', 'support', 'viewer');
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;

    DO $$ BEGIN
      CREATE TYPE ticket_priority AS ENUM ('low', 'medium', 'high', 'urgent');
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;

    DO $$ BEGIN
      CREATE TYPE ticket_status AS ENUM ('open', 'in_progress', 'waiting_customer', 'resolved', 'closed', 'cancelled');
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;

    DO $$ BEGIN
      CREATE TYPE ticket_category AS ENUM ('technical', 'billing', 'feature_request', 'general', 'bug');
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;

    DO $$ BEGIN
      CREATE TYPE subscription_status AS ENUM ('trial', 'active', 'inactive', 'cancelled', 'suspended');
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;

    DO $$ BEGIN
      CREATE TYPE billing_cycle AS ENUM ('monthly', 'quarterly', 'semi_annual', 'annual', 'custom');
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;

    DO $$ BEGIN
      CREATE TYPE discount_type AS ENUM ('percentage', 'fixed');
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;

    DO $$ BEGIN
      CREATE TYPE invoice_status AS ENUM ('draft', 'sent', 'pending', 'paid', 'overdue', 'cancelled', 'refunded');
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;

    DO $$ BEGIN
      CREATE TYPE acceptance_status AS ENUM ('pending', 'accepted', 'expired', 'cancelled');
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;

    DO $$ BEGIN
      CREATE TYPE subscription_audit_action AS ENUM ('created', 'activated', 'deactivated', 'updated', 'cancelled', 'renewed', 'terms_accepted', 'price_changed');
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;

    DO $$ BEGIN
      CREATE TYPE reservation_status AS ENUM ('pending', 'approved', 'rejected', 'cancelled');
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;

    DO $$ BEGIN
      CREATE TYPE access_request_status AS ENUM ('pending', 'approved', 'rejected');
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;

    DO $$ BEGIN
      CREATE TYPE notification_category AS ENUM ('payment', 'quota', 'announcement', 'reminder', 'alert', 'system');
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;

    DO $$ BEGIN
      CREATE TYPE notification_channel AS ENUM ('in_app', 'email', 'push');
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;

    DO $$ BEGIN
      CREATE TYPE device_platform AS ENUM ('web', 'ios', 'android');
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;

    DO $$ BEGIN
      CREATE TYPE delivery_status AS ENUM ('pending', 'sent', 'delivered', 'failed', 'bounced');
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;

    DO $$ BEGIN
      CREATE TYPE bank_account_category AS ENUM ('national', 'international');
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;

    DO $$ BEGIN
      CREATE TYPE ve_account_type AS ENUM ('corriente', 'ahorro', 'divisas');
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;

    DO $$ BEGIN
      CREATE TYPE bank_payment_method AS ENUM ('transfer', 'pago_movil', 'interbancario', 'wire_transfer', 'ach', 'zelle', 'paypal', 'wise', 'crypto', 'other');
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;

    DO $$ BEGIN
      CREATE TYPE service_provider_type AS ENUM ('individual', 'company', 'cooperative', 'government', 'internal');
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;

    DO $$ BEGIN
      CREATE TYPE assignment_scope AS ENUM ('condominium', 'building', 'unit');
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;

    DO $$ BEGIN
      CREATE TYPE distribution_method AS ENUM ('by_aliquot', 'equal_split', 'fixed_per_unit');
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;

    DO $$ BEGIN
      CREATE TYPE charge_adjustment_type AS ENUM ('percentage', 'fixed', 'none');
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;

    CREATE TABLE IF NOT EXISTS locations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(200) NOT NULL,
      location_type location_type NOT NULL,
      parent_id UUID REFERENCES locations(id) ON DELETE CASCADE,
      code VARCHAR(50),
      is_active BOOLEAN DEFAULT true,
      metadata JSONB,
      registered_by UUID,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS currencies (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      code VARCHAR(10) NOT NULL UNIQUE,
      name VARCHAR(100) NOT NULL,
      symbol VARCHAR(10),
      is_base_currency BOOLEAN DEFAULT false,
      is_active BOOLEAN DEFAULT true,
      decimals INTEGER DEFAULT 2,
      registered_by UUID,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      firebase_uid VARCHAR(128) NOT NULL UNIQUE,
      email VARCHAR(255) NOT NULL UNIQUE,
      display_name VARCHAR(255),
      phone_country_code VARCHAR(10),
      phone_number VARCHAR(50),
      photo_url TEXT,
      first_name VARCHAR(100),
      last_name VARCHAR(100),
      id_document_type VARCHAR(50),
      id_document_number VARCHAR(50),
      address VARCHAR(500),
      location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
      preferred_language VARCHAR(10) DEFAULT 'es',
      preferred_currency_id UUID REFERENCES currencies(id) ON DELETE SET NULL,
      is_active BOOLEAN DEFAULT true,
      is_email_verified BOOLEAN DEFAULT false,
      last_login TIMESTAMP,
      metadata JSONB,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS exchange_rates (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      from_currency_id UUID NOT NULL REFERENCES currencies(id) ON DELETE CASCADE,
      to_currency_id UUID NOT NULL REFERENCES currencies(id) ON DELETE CASCADE,
      rate DECIMAL(20, 8) NOT NULL,
      effective_date DATE NOT NULL,
      source VARCHAR(100),
      created_by UUID REFERENCES users(id) ON DELETE SET NULL,
      registered_by UUID REFERENCES users(id) ON DELETE SET NULL,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      CONSTRAINT check_different_currencies CHECK (from_currency_id != to_currency_id)
    );

    CREATE TABLE IF NOT EXISTS permissions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(100) NOT NULL UNIQUE,
      description TEXT,
      module VARCHAR(50) NOT NULL,
      action VARCHAR(50) NOT NULL,
      registered_by UUID REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS roles (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(100) NOT NULL UNIQUE,
      description TEXT,
      is_system_role BOOLEAN DEFAULT false,
      registered_by UUID REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS role_permissions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
      permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
      registered_by UUID REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS management_companies (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL,
      legal_name VARCHAR(255),
      tax_id_type VARCHAR(50),
      tax_id_number VARCHAR(100),
      email VARCHAR(255),
      phone_country_code VARCHAR(10),
      phone VARCHAR(50),
      website VARCHAR(255),
      address VARCHAR(500),
      location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
      is_active BOOLEAN DEFAULT true,
      logo_url TEXT,
      metadata JSONB,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      created_by UUID REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS condominiums (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL,
      code VARCHAR(50) UNIQUE,
      address VARCHAR(500),
      location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
      email VARCHAR(255),
      phone_country_code VARCHAR(10),
      phone VARCHAR(50),
      default_currency_id UUID REFERENCES currencies(id) ON DELETE SET NULL,
      is_active BOOLEAN DEFAULT true,
      metadata JSONB,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      created_by UUID REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS condominium_management_companies (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      condominium_id UUID NOT NULL REFERENCES condominiums(id) ON DELETE CASCADE,
      management_company_id UUID NOT NULL REFERENCES management_companies(id) ON DELETE CASCADE,
      assigned_by UUID REFERENCES users(id) ON DELETE SET NULL,
      assigned_at TIMESTAMP DEFAULT NOW(),
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS buildings (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      condominium_id UUID NOT NULL REFERENCES condominiums(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      code VARCHAR(50),
      address VARCHAR(500),
      floors_count INTEGER,
      units_count INTEGER,
      bank_account_holder VARCHAR(255),
      bank_name VARCHAR(100),
      bank_account_number VARCHAR(100),
      bank_account_type VARCHAR(50),
      is_active BOOLEAN DEFAULT true,
      metadata JSONB,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      created_by UUID REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS user_roles (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
      condominium_id UUID REFERENCES condominiums(id) ON DELETE CASCADE,
      building_id UUID REFERENCES buildings(id) ON DELETE CASCADE,
      management_company_id UUID REFERENCES management_companies(id) ON DELETE CASCADE,
      is_active BOOLEAN DEFAULT true,
      notes TEXT,
      assigned_at TIMESTAMP DEFAULT NOW(),
      assigned_by UUID REFERENCES users(id) ON DELETE SET NULL,
      registered_by UUID REFERENCES users(id) ON DELETE SET NULL,
      expires_at TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS units (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      building_id UUID NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
      unit_number VARCHAR(50) NOT NULL,
      floor INTEGER,
      area_m2 DECIMAL(10, 2),
      bedrooms INTEGER,
      bathrooms INTEGER,
      parking_spaces INTEGER DEFAULT 0,
      parking_identifiers TEXT[],
      storage_identifier VARCHAR(50),
      aliquot_percentage DECIMAL(10, 6),
      is_active BOOLEAN DEFAULT true,
      metadata JSONB,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      created_by UUID REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS unit_ownerships (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      full_name VARCHAR(255) NOT NULL,
      email VARCHAR(255),
      phone VARCHAR(50),
      phone_country_code VARCHAR(10),
      id_document_type VARCHAR(50),
      id_document_number VARCHAR(50),
      is_registered BOOLEAN DEFAULT false,
      ownership_type ownership_type NOT NULL,
      ownership_percentage DECIMAL(5, 2),
      title_deed_number VARCHAR(100),
      title_deed_date DATE,
      start_date DATE NOT NULL,
      end_date DATE,
      is_active BOOLEAN DEFAULT true,
      is_primary_residence BOOLEAN DEFAULT false,
      metadata JSONB,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS payment_concepts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      condominium_id UUID REFERENCES condominiums(id) ON DELETE CASCADE,
      building_id UUID REFERENCES buildings(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      concept_type concept_type NOT NULL,
      is_recurring BOOLEAN DEFAULT true,
      recurrence_period VARCHAR(50),
      currency_id UUID NOT NULL REFERENCES currencies(id) ON DELETE RESTRICT,
      allows_partial_payment BOOLEAN DEFAULT true,
      late_payment_type charge_adjustment_type DEFAULT 'none',
      late_payment_value DECIMAL(10,4),
      late_payment_grace_days INTEGER DEFAULT 0,
      early_payment_type charge_adjustment_type DEFAULT 'none',
      early_payment_value DECIMAL(10,4),
      early_payment_days_before_due INTEGER DEFAULT 0,
      issue_day INTEGER,
      due_day INTEGER,
      is_active BOOLEAN DEFAULT true,
      metadata JSONB,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      created_by UUID REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS payment_concept_assignments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      payment_concept_id UUID NOT NULL REFERENCES payment_concepts(id) ON DELETE CASCADE,
      scope_type assignment_scope NOT NULL,
      condominium_id UUID NOT NULL REFERENCES condominiums(id) ON DELETE CASCADE,
      building_id UUID REFERENCES buildings(id) ON DELETE CASCADE,
      unit_id UUID REFERENCES units(id) ON DELETE CASCADE,
      distribution_method distribution_method NOT NULL,
      amount DECIMAL(15,2) NOT NULL,
      is_active BOOLEAN DEFAULT true,
      assigned_by UUID REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_pca_unique_assignment
      ON payment_concept_assignments (payment_concept_id, scope_type, COALESCE(building_id, '00000000-0000-0000-0000-000000000000'), COALESCE(unit_id, '00000000-0000-0000-0000-000000000000'));

    CREATE TABLE IF NOT EXISTS interest_configurations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      condominium_id UUID REFERENCES condominiums(id) ON DELETE CASCADE,
      building_id UUID REFERENCES buildings(id) ON DELETE CASCADE,
      payment_concept_id UUID REFERENCES payment_concepts(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      interest_type interest_type NOT NULL,
      interest_rate DECIMAL(10, 6),
      fixed_amount DECIMAL(15, 2),
      calculation_period VARCHAR(50),
      grace_period_days INTEGER DEFAULT 0,
      currency_id UUID REFERENCES currencies(id) ON DELETE RESTRICT,
      is_active BOOLEAN DEFAULT true,
      effective_from DATE NOT NULL,
      effective_to DATE,
      metadata JSONB,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      created_by UUID REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS quotas (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
      payment_concept_id UUID NOT NULL REFERENCES payment_concepts(id) ON DELETE RESTRICT,
      period_year INTEGER NOT NULL,
      period_month INTEGER,
      period_description VARCHAR(100),
      base_amount DECIMAL(15, 2) NOT NULL,
      currency_id UUID NOT NULL REFERENCES currencies(id) ON DELETE RESTRICT,
      interest_amount DECIMAL(15, 2) DEFAULT 0,
      amount_in_base_currency DECIMAL(15, 2),
      exchange_rate_used DECIMAL(20, 8),
      issue_date DATE NOT NULL,
      due_date DATE NOT NULL,
      status quota_status DEFAULT 'pending',
      paid_amount DECIMAL(15, 2) DEFAULT 0,
      balance DECIMAL(15, 2) NOT NULL,
      notes TEXT,
      metadata JSONB,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      created_by UUID REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS quota_adjustments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      quota_id UUID NOT NULL REFERENCES quotas(id) ON DELETE CASCADE,
      previous_amount DECIMAL(15, 2) NOT NULL,
      new_amount DECIMAL(15, 2) NOT NULL,
      adjustment_type adjustment_type NOT NULL,
      reason TEXT NOT NULL,
      created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
      created_at TIMESTAMP DEFAULT NOW(),
      CONSTRAINT check_amount_changed CHECK (previous_amount != new_amount)
    );

    CREATE TABLE IF NOT EXISTS quota_formulas (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      condominium_id UUID NOT NULL REFERENCES condominiums(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      formula_type formula_type NOT NULL,
      fixed_amount DECIMAL(15, 2),
      expression TEXT,
      variables JSONB,
      unit_amounts JSONB,
      currency_id UUID NOT NULL REFERENCES currencies(id) ON DELETE RESTRICT,
      is_active BOOLEAN DEFAULT true,
      created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
      updated_at TIMESTAMP DEFAULT NOW(),
      update_reason TEXT
    );

    CREATE TABLE IF NOT EXISTS quota_generation_rules (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      condominium_id UUID NOT NULL REFERENCES condominiums(id) ON DELETE CASCADE,
      building_id UUID REFERENCES buildings(id) ON DELETE CASCADE,
      payment_concept_id UUID NOT NULL REFERENCES payment_concepts(id) ON DELETE CASCADE,
      quota_formula_id UUID NOT NULL REFERENCES quota_formulas(id) ON DELETE RESTRICT,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      effective_from DATE NOT NULL,
      effective_to DATE,
      is_active BOOLEAN DEFAULT true,
      created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
      updated_at TIMESTAMP DEFAULT NOW(),
      update_reason TEXT
    );

    CREATE TABLE IF NOT EXISTS quota_generation_schedules (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      quota_generation_rule_id UUID NOT NULL REFERENCES quota_generation_rules(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      frequency_type frequency_type NOT NULL,
      frequency_value INTEGER,
      generation_day INTEGER NOT NULL,
      periods_in_advance INTEGER DEFAULT 1,
      issue_day INTEGER NOT NULL,
      due_day INTEGER NOT NULL,
      grace_days INTEGER DEFAULT 0,
      is_active BOOLEAN DEFAULT true,
      last_generated_period VARCHAR(20),
      last_generated_at TIMESTAMP,
      next_generation_date DATE,
      created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
      updated_at TIMESTAMP DEFAULT NOW(),
      update_reason TEXT
    );

    CREATE TABLE IF NOT EXISTS quota_generation_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      generation_rule_id UUID REFERENCES quota_generation_rules(id) ON DELETE SET NULL,
      generation_schedule_id UUID REFERENCES quota_generation_schedules(id) ON DELETE SET NULL,
      quota_formula_id UUID REFERENCES quota_formulas(id) ON DELETE SET NULL,
      generation_method generation_method NOT NULL,
      period_year INTEGER NOT NULL,
      period_month INTEGER,
      period_description VARCHAR(100),
      quotas_created INTEGER NOT NULL DEFAULT 0,
      quotas_failed INTEGER NOT NULL DEFAULT 0,
      total_amount DECIMAL(15, 2),
      currency_id UUID REFERENCES currencies(id) ON DELETE SET NULL,
      units_affected UUID[],
      parameters JSONB,
      formula_snapshot JSONB,
      status generation_status NOT NULL,
      error_details TEXT,
      generated_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
      generated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS payment_gateways (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(100) NOT NULL UNIQUE,
      gateway_type gateway_type NOT NULL,
      configuration JSONB,
      supported_currencies UUID[],
      is_active BOOLEAN DEFAULT true,
      is_sandbox BOOLEAN DEFAULT false,
      metadata JSONB,
      registered_by UUID REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS entity_payment_gateways (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      payment_gateway_id UUID NOT NULL REFERENCES payment_gateways(id) ON DELETE CASCADE,
      condominium_id UUID REFERENCES condominiums(id) ON DELETE CASCADE,
      building_id UUID REFERENCES buildings(id) ON DELETE CASCADE,
      entity_configuration JSONB,
      is_active BOOLEAN DEFAULT true,
      registered_by UUID REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS payments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      payment_number VARCHAR(100) UNIQUE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
      unit_id UUID NOT NULL REFERENCES units(id) ON DELETE RESTRICT,
      amount DECIMAL(15, 2) NOT NULL,
      currency_id UUID NOT NULL REFERENCES currencies(id) ON DELETE RESTRICT,
      paid_amount DECIMAL(15, 2),
      paid_currency_id UUID REFERENCES currencies(id) ON DELETE RESTRICT,
      exchange_rate DECIMAL(20, 8),
      payment_method payment_method NOT NULL,
      payment_gateway_id UUID REFERENCES payment_gateways(id) ON DELETE SET NULL,
      payment_details JSONB,
      payment_date DATE NOT NULL,
      registered_at TIMESTAMP DEFAULT NOW(),
      status payment_status DEFAULT 'completed',
      receipt_url TEXT,
      receipt_number VARCHAR(100),
      notes TEXT,
      metadata JSONB,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      registered_by UUID REFERENCES users(id) ON DELETE SET NULL,
      verified_by UUID REFERENCES users(id) ON DELETE SET NULL,
      verified_at TIMESTAMP,
      verification_notes TEXT
    );

    CREATE TABLE IF NOT EXISTS payment_applications (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
      quota_id UUID NOT NULL REFERENCES quotas(id) ON DELETE CASCADE,
      applied_amount DECIMAL(15, 2) NOT NULL,
      applied_to_principal DECIMAL(15, 2) DEFAULT 0,
      applied_to_interest DECIMAL(15, 2) DEFAULT 0,
      registered_by UUID REFERENCES users(id) ON DELETE SET NULL,
      applied_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS payment_pending_allocations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
      pending_amount DECIMAL(15, 2) NOT NULL,
      currency_id UUID NOT NULL REFERENCES currencies(id) ON DELETE RESTRICT,
      status allocation_status NOT NULL DEFAULT 'pending',
      resolution_type VARCHAR(50),
      resolution_notes TEXT,
      allocated_to_quota_id UUID REFERENCES quotas(id) ON DELETE SET NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      allocated_by UUID REFERENCES users(id) ON DELETE SET NULL,
      allocated_at TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS expense_categories (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(100) NOT NULL,
      description TEXT,
      parent_category_id UUID REFERENCES expense_categories(id) ON DELETE CASCADE,
      is_active BOOLEAN DEFAULT true,
      registered_by UUID REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS expenses (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      condominium_id UUID REFERENCES condominiums(id) ON DELETE CASCADE,
      building_id UUID REFERENCES buildings(id) ON DELETE CASCADE,
      expense_category_id UUID REFERENCES expense_categories(id) ON DELETE SET NULL,
      description TEXT NOT NULL,
      expense_date DATE NOT NULL,
      amount DECIMAL(15, 2) NOT NULL,
      currency_id UUID NOT NULL REFERENCES currencies(id) ON DELETE RESTRICT,
      vendor_name VARCHAR(255),
      vendor_tax_id VARCHAR(100),
      invoice_number VARCHAR(100),
      invoice_url TEXT,
      status expense_status DEFAULT 'pending',
      approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
      approved_at TIMESTAMP,
      notes TEXT,
      metadata JSONB,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      created_by UUID REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS documents (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      document_type document_type NOT NULL,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      condominium_id UUID REFERENCES condominiums(id) ON DELETE CASCADE,
      building_id UUID REFERENCES buildings(id) ON DELETE CASCADE,
      unit_id UUID REFERENCES units(id) ON DELETE CASCADE,
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      payment_id UUID REFERENCES payments(id) ON DELETE CASCADE,
      quota_id UUID REFERENCES quotas(id) ON DELETE CASCADE,
      expense_id UUID REFERENCES expenses(id) ON DELETE CASCADE,
      file_url TEXT NOT NULL,
      file_name VARCHAR(255),
      file_size INTEGER,
      file_type VARCHAR(50),
      document_date DATE,
      document_number VARCHAR(100),
      is_public BOOLEAN DEFAULT false,
      metadata JSONB,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      created_by UUID REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS messages (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      recipient_type recipient_type NOT NULL,
      recipient_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      recipient_condominium_id UUID REFERENCES condominiums(id) ON DELETE CASCADE,
      recipient_building_id UUID REFERENCES buildings(id) ON DELETE CASCADE,
      recipient_unit_id UUID REFERENCES units(id) ON DELETE CASCADE,
      subject VARCHAR(255),
      body TEXT NOT NULL,
      message_type message_type DEFAULT 'message',
      priority priority DEFAULT 'normal',
      attachments JSONB,
      is_read BOOLEAN DEFAULT false,
      read_at TIMESTAMP,
      metadata JSONB,
      registered_by UUID REFERENCES users(id) ON DELETE SET NULL,
      sent_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      table_name VARCHAR(100) NOT NULL,
      record_id UUID NOT NULL,
      action audit_action NOT NULL,
      old_values JSONB,
      new_values JSONB,
      changed_fields TEXT[],
      user_id UUID REFERENCES users(id) ON DELETE SET NULL,
      ip_address INET,
      user_agent TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS superadmin_users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      notes TEXT,
      is_active BOOLEAN DEFAULT true,
      last_access_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      created_by UUID REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS superadmin_user_permissions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      superadmin_user_id UUID NOT NULL REFERENCES superadmin_users(id) ON DELETE CASCADE,
      permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
      created_at TIMESTAMP DEFAULT NOW(),
      created_by UUID REFERENCES users(id) ON DELETE SET NULL,
      UNIQUE(superadmin_user_id, permission_id)
    );

    CREATE TABLE IF NOT EXISTS admin_invitations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      management_company_id UUID NOT NULL REFERENCES management_companies(id) ON DELETE CASCADE,
      token VARCHAR(128) NOT NULL UNIQUE,
      token_hash VARCHAR(64) NOT NULL,
      status admin_invitation_status NOT NULL DEFAULT 'pending',
      email VARCHAR(255) NOT NULL,
      expires_at TIMESTAMP NOT NULL,
      accepted_at TIMESTAMP,
      email_error TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      created_by UUID REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS user_permissions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
      is_enabled BOOLEAN NOT NULL DEFAULT true,
      assigned_by UUID REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(user_id, permission_id)
    );

    CREATE TABLE IF NOT EXISTS user_invitations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      condominium_id UUID REFERENCES condominiums(id) ON DELETE CASCADE,
      unit_id UUID REFERENCES units(id) ON DELETE CASCADE,
      role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
      token VARCHAR(128) NOT NULL UNIQUE,
      token_hash VARCHAR(64) NOT NULL,
      status admin_invitation_status NOT NULL DEFAULT 'pending',
      email VARCHAR(255) NOT NULL,
      expires_at TIMESTAMP NOT NULL,
      accepted_at TIMESTAMP,
      email_error TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      created_by UUID REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS management_company_members (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      management_company_id UUID NOT NULL REFERENCES management_companies(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role_name member_role NOT NULL,
      user_role_id UUID REFERENCES user_roles(id) ON DELETE SET NULL,
      permissions JSONB,
      is_primary_admin BOOLEAN DEFAULT false,
      joined_at TIMESTAMP DEFAULT NOW(),
      invited_at TIMESTAMP,
      invited_by UUID REFERENCES users(id) ON DELETE SET NULL,
      is_active BOOLEAN DEFAULT true,
      deactivated_at TIMESTAMP,
      deactivated_by UUID REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(management_company_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS support_tickets (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      ticket_number VARCHAR(50) NOT NULL UNIQUE,
      management_company_id UUID NOT NULL REFERENCES management_companies(id) ON DELETE CASCADE,
      created_by_user_id UUID NOT NULL REFERENCES users(id),
      created_by_member_id UUID REFERENCES management_company_members(id),
      subject VARCHAR(255) NOT NULL,
      description TEXT NOT NULL,
      priority ticket_priority NOT NULL DEFAULT 'medium',
      status ticket_status NOT NULL DEFAULT 'open',
      category ticket_category,
      assigned_to UUID REFERENCES users(id),
      assigned_at TIMESTAMP,
      resolved_at TIMESTAMP,
      resolved_by UUID REFERENCES users(id),
      solution TEXT,
      closed_at TIMESTAMP,
      closed_by UUID REFERENCES users(id),
      metadata JSONB,
      tags TEXT[],
      is_active BOOLEAN DEFAULT true NOT NULL,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP DEFAULT NOW() NOT NULL
    );

    CREATE TABLE IF NOT EXISTS support_ticket_messages (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id),
      message TEXT NOT NULL,
      is_internal BOOLEAN DEFAULT false NOT NULL,
      attachments JSONB,
      is_active BOOLEAN DEFAULT true NOT NULL,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP DEFAULT NOW() NOT NULL
    );

    CREATE TABLE IF NOT EXISTS support_ticket_assignment_history (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
      assigned_to UUID NOT NULL REFERENCES users(id),
      assigned_by UUID NOT NULL REFERENCES users(id),
      assigned_at TIMESTAMP NOT NULL DEFAULT NOW(),
      unassigned_at TIMESTAMP,
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS subscription_rates (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(100) NOT NULL,
      description TEXT,
      condominium_rate DECIMAL(10, 2) NOT NULL,
      unit_rate DECIMAL(10, 4) NOT NULL,
      user_rate DECIMAL(10, 2) NOT NULL DEFAULT '0',
      annual_discount_percentage DECIMAL(5, 2) DEFAULT '15' NOT NULL,
      min_condominiums INTEGER DEFAULT 1 NOT NULL,
      max_condominiums INTEGER,
      version VARCHAR(50) NOT NULL,
      is_active BOOLEAN DEFAULT false NOT NULL,
      effective_from TIMESTAMP NOT NULL,
      effective_until TIMESTAMP,
      created_by UUID REFERENCES users(id) ON DELETE SET NULL,
      updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP DEFAULT NOW() NOT NULL
    );

    CREATE TABLE IF NOT EXISTS subscription_terms_conditions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      version VARCHAR(50) NOT NULL UNIQUE,
      title VARCHAR(255) NOT NULL,
      content TEXT NOT NULL,
      summary TEXT,
      effective_from TIMESTAMP NOT NULL,
      effective_until TIMESTAMP,
      is_active BOOLEAN DEFAULT true NOT NULL,
      created_by UUID REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP DEFAULT NOW() NOT NULL
    );

    CREATE TABLE IF NOT EXISTS management_company_subscriptions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      management_company_id UUID NOT NULL REFERENCES management_companies(id) ON DELETE CASCADE,
      subscription_name VARCHAR(100),
      billing_cycle billing_cycle NOT NULL,
      base_price DECIMAL(10, 2) NOT NULL,
      currency_id UUID REFERENCES currencies(id) ON DELETE RESTRICT,
      pricing_condominium_count INTEGER,
      pricing_unit_count INTEGER,
      pricing_condominium_rate DECIMAL(10, 2),
      pricing_unit_rate DECIMAL(10, 4),
      calculated_price DECIMAL(10, 2),
      discount_type discount_type,
      discount_value DECIMAL(10, 2),
      discount_amount DECIMAL(10, 2),
      pricing_notes TEXT,
      rate_id UUID REFERENCES subscription_rates(id) ON DELETE SET NULL,
      max_condominiums INTEGER,
      max_units INTEGER,
      max_users INTEGER,
      max_storage_gb INTEGER,
      custom_features JSONB,
      custom_rules JSONB,
      status subscription_status DEFAULT 'trial' NOT NULL,
      start_date TIMESTAMP DEFAULT NOW() NOT NULL,
      end_date TIMESTAMP,
      next_billing_date TIMESTAMP,
      trial_ends_at TIMESTAMP,
      auto_renew BOOLEAN DEFAULT true,
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      created_by UUID REFERENCES users(id) ON DELETE SET NULL,
      updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
      cancelled_at TIMESTAMP,
      cancelled_by UUID REFERENCES users(id) ON DELETE SET NULL,
      cancellation_reason TEXT
    );

    CREATE TABLE IF NOT EXISTS subscription_acceptances (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      subscription_id UUID NOT NULL REFERENCES management_company_subscriptions(id) ON DELETE CASCADE,
      terms_conditions_id UUID NOT NULL REFERENCES subscription_terms_conditions(id) ON DELETE RESTRICT,
      token VARCHAR(64) NOT NULL,
      token_hash VARCHAR(64) NOT NULL UNIQUE,
      status acceptance_status DEFAULT 'pending' NOT NULL,
      expires_at TIMESTAMP NOT NULL,
      accepted_by UUID REFERENCES users(id) ON DELETE SET NULL,
      accepted_at TIMESTAMP,
      acceptor_email VARCHAR(255),
      ip_address INET,
      user_agent TEXT,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL
    );

    CREATE TABLE IF NOT EXISTS subscription_invoices (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      invoice_number VARCHAR(50) NOT NULL UNIQUE,
      subscription_id UUID NOT NULL REFERENCES management_company_subscriptions(id) ON DELETE RESTRICT,
      management_company_id UUID NOT NULL REFERENCES management_companies(id) ON DELETE CASCADE,
      amount DECIMAL(10, 2) NOT NULL,
      currency_id UUID REFERENCES currencies(id) ON DELETE RESTRICT,
      tax_amount DECIMAL(10, 2) DEFAULT '0',
      total_amount DECIMAL(10, 2) NOT NULL,
      status invoice_status DEFAULT 'pending' NOT NULL,
      issue_date TIMESTAMP DEFAULT NOW() NOT NULL,
      due_date TIMESTAMP NOT NULL,
      paid_date TIMESTAMP,
      payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
      payment_method VARCHAR(50),
      billing_period_start TIMESTAMP NOT NULL,
      billing_period_end TIMESTAMP NOT NULL,
      metadata JSONB,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS subscription_audit_history (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      subscription_id UUID NOT NULL REFERENCES management_company_subscriptions(id) ON DELETE CASCADE,
      action subscription_audit_action NOT NULL,
      previous_values JSONB,
      new_values JSONB,
      changed_fields TEXT[],
      performed_by UUID REFERENCES users(id) ON DELETE SET NULL,
      performed_at TIMESTAMP DEFAULT NOW() NOT NULL,
      reason TEXT,
      ip_address INET,
      user_agent TEXT
    );

    CREATE TABLE IF NOT EXISTS amenities (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      condominium_id UUID NOT NULL REFERENCES condominiums(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      location VARCHAR(255),
      capacity INTEGER,
      requires_approval BOOLEAN DEFAULT false,
      reservation_rules JSONB,
      is_active BOOLEAN DEFAULT true,
      metadata JSONB,
      created_by UUID REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS amenity_reservations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      amenity_id UUID NOT NULL REFERENCES amenities(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      start_time TIMESTAMP NOT NULL,
      end_time TIMESTAMP NOT NULL,
      status reservation_status DEFAULT 'pending',
      notes TEXT,
      rejection_reason TEXT,
      approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
      approved_at TIMESTAMP,
      cancelled_at TIMESTAMP,
      metadata JSONB,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS notification_templates (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      code VARCHAR(100) NOT NULL UNIQUE,
      name VARCHAR(255) NOT NULL,
      category notification_category NOT NULL,
      subject_template VARCHAR(500),
      body_template TEXT NOT NULL,
      variables JSONB,
      default_channels JSONB DEFAULT '["in_app"]',
      is_active BOOLEAN DEFAULT true,
      metadata JSONB,
      created_by UUID REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      template_id UUID REFERENCES notification_templates(id) ON DELETE SET NULL,
      category notification_category NOT NULL,
      title VARCHAR(255) NOT NULL,
      body TEXT NOT NULL,
      priority priority DEFAULT 'normal',
      data JSONB,
      is_read BOOLEAN DEFAULT false,
      read_at TIMESTAMP,
      expires_at TIMESTAMP,
      metadata JSONB,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS notification_deliveries (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
      channel notification_channel NOT NULL,
      status delivery_status DEFAULT 'pending',
      sent_at TIMESTAMP,
      delivered_at TIMESTAMP,
      failed_at TIMESTAMP,
      error_message TEXT,
      retry_count INTEGER DEFAULT 0,
      external_id VARCHAR(255),
      metadata JSONB,
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(notification_id, channel)
    );

    CREATE TABLE IF NOT EXISTS user_notification_preferences (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      category notification_category NOT NULL,
      channel notification_channel NOT NULL,
      is_enabled BOOLEAN DEFAULT true,
      quiet_hours_start VARCHAR(5),
      quiet_hours_end VARCHAR(5),
      metadata JSONB,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(user_id, category, channel)
    );

    CREATE TABLE IF NOT EXISTS condominium_access_codes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      condominium_id UUID NOT NULL REFERENCES condominiums(id) ON DELETE CASCADE,
      code VARCHAR(8) NOT NULL UNIQUE,
      expires_at TIMESTAMP NOT NULL,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      created_by UUID REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS access_requests (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      condominium_id UUID NOT NULL REFERENCES condominiums(id) ON DELETE CASCADE,
      unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      access_code_id UUID NOT NULL REFERENCES condominium_access_codes(id) ON DELETE CASCADE,
      ownership_type ownership_type NOT NULL,
      status access_request_status DEFAULT 'pending' NOT NULL,
      admin_notes TEXT,
      reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
      reviewed_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS user_fcm_tokens (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token VARCHAR(500) NOT NULL,
      platform device_platform NOT NULL,
      device_name VARCHAR(255),
      is_active BOOLEAN DEFAULT true,
      last_used_at TIMESTAMP,
      metadata JSONB,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(user_id, token)
    );

    CREATE TABLE IF NOT EXISTS banks (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL,
      code VARCHAR(20),
      swift_code VARCHAR(11),
      country VARCHAR(2) NOT NULL,
      account_category bank_account_category NOT NULL,
      supported_payment_methods bank_payment_method[],
      logo_url TEXT,
      is_active BOOLEAN DEFAULT true,
      metadata JSONB,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS bank_accounts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      management_company_id UUID NOT NULL REFERENCES management_companies(id) ON DELETE CASCADE,
      bank_id UUID REFERENCES banks(id) ON DELETE SET NULL,
      account_category bank_account_category NOT NULL,
      display_name VARCHAR(255) NOT NULL,
      bank_name VARCHAR(255) NOT NULL,
      account_holder_name VARCHAR(255) NOT NULL,
      currency VARCHAR(3) NOT NULL,
      currency_id UUID REFERENCES currencies(id) ON DELETE RESTRICT,
      account_details JSONB NOT NULL,
      accepted_payment_methods bank_payment_method[] NOT NULL,
      applies_to_all_condominiums BOOLEAN DEFAULT false,
      is_active BOOLEAN DEFAULT true,
      notes TEXT,
      created_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
      deactivated_by UUID REFERENCES users(id) ON DELETE SET NULL,
      deactivated_at TIMESTAMP,
      metadata JSONB,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS bank_account_condominiums (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      bank_account_id UUID NOT NULL REFERENCES bank_accounts(id) ON DELETE CASCADE,
      condominium_id UUID NOT NULL REFERENCES condominiums(id) ON DELETE CASCADE,
      assigned_by UUID REFERENCES users(id) ON DELETE SET NULL,
      assigned_at TIMESTAMP DEFAULT NOW(),
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(bank_account_id, condominium_id)
    );

    CREATE TABLE IF NOT EXISTS payment_concept_bank_accounts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      payment_concept_id UUID NOT NULL REFERENCES payment_concepts(id) ON DELETE CASCADE,
      bank_account_id UUID NOT NULL REFERENCES bank_accounts(id) ON DELETE CASCADE,
      assigned_by UUID REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(payment_concept_id, bank_account_id)
    );

    CREATE TABLE IF NOT EXISTS condominium_services (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      condominium_id UUID NOT NULL REFERENCES condominiums(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      provider_type service_provider_type NOT NULL,
      legal_name VARCHAR(255),
      tax_id_type VARCHAR(5),
      tax_id_number VARCHAR(50),
      email VARCHAR(255),
      phone_country_code VARCHAR(10),
      phone VARCHAR(50),
      address VARCHAR(500),
      location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
      charges_iva BOOLEAN DEFAULT false NOT NULL,
      iva_rate DECIMAL(5, 4) DEFAULT '0.16' NOT NULL,
      subject_to_islr_retention BOOLEAN DEFAULT false NOT NULL,
      islr_retention_rate DECIMAL(5, 4) DEFAULT '0.01' NOT NULL,
      is_default BOOLEAN DEFAULT false,
      is_active BOOLEAN DEFAULT true,
      metadata JSONB,
      created_by UUID REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS payment_concept_services (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      payment_concept_id UUID NOT NULL REFERENCES payment_concepts(id) ON DELETE CASCADE,
      service_id UUID NOT NULL REFERENCES condominium_services(id) ON DELETE CASCADE,
      amount DECIMAL(15, 2) NOT NULL,
      use_default_amount BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(payment_concept_id, service_id)
    );
  `)
  const elapsed = performance.now() - start
  console.log(`[TestContainer] createSchema took ${elapsed.toFixed(1)}ms`)
}

/**
 * Stops the database connection and cleans up resources.
 */
export async function stopTestContainer(): Promise<void> {
  startPromise = null

  if (client) {
    try {
      await client.end({ timeout: 5 })
    } catch {
      // Ignore errors on close
    }
    client = null
  }

  db = null

  // Drop schema
  if (schemaName) {
    const adminClient = postgres(TEST_DATABASE_URL, { max: 1, onnotice: () => {} })
    await adminClient`DROP SCHEMA IF EXISTS ${adminClient.unsafe(schemaName)} CASCADE`
    await adminClient.end()
    schemaName = null
  }

  // Reset DatabaseService singleton to avoid state leaks between test files
  try {
    const { DatabaseService } = await import('@database/service')
    DatabaseService.resetInstance()
  } catch {
    // Ignore if import fails
  }
}

/**
 * Cleans all data from tables (for test isolation).
 * Uses a single TRUNCATE command for better performance.
 */
export async function cleanDatabase(testDb: TTestDrizzleClient | import('@database/repositories/interfaces').TDrizzleClient): Promise<void> {
  const start = performance.now()
  // Truncate all tables in one command for better performance
  await testDb.execute(sql`
    TRUNCATE TABLE
      payment_concept_services,
      condominium_services,
      bank_account_condominiums,
      bank_accounts,
      banks,
      access_requests,
      condominium_access_codes,
      user_fcm_tokens,
      user_notification_preferences,
      notification_deliveries,
      notifications,
      notification_templates,
      amenity_reservations,
      amenities,
      subscription_audit_history,
      subscription_invoices,
      subscription_acceptances,
      management_company_subscriptions,
      subscription_terms_conditions,
      subscription_rates,
      support_ticket_assignment_history,
      support_ticket_messages,
      support_tickets,
      management_company_members,
      audit_logs,
      messages,
      documents,
      expenses,
      expense_categories,
      payment_pending_allocations,
      payment_applications,
      payments,
      entity_payment_gateways,
      payment_gateways,
      quota_generation_logs,
      quota_generation_schedules,
      quota_generation_rules,
      quota_formulas,
      quota_adjustments,
      quotas,
      interest_configurations,
      payment_concept_bank_accounts,
      payment_concept_assignments,
      payment_concepts,
      unit_ownerships,
      units,
      user_roles,
      buildings,
      condominium_management_companies,
      condominiums,
      admin_invitations,
      user_invitations,
      user_permissions,
      management_companies,
      role_permissions,
      roles,
      superadmin_user_permissions,
      superadmin_users,
      permissions,
      exchange_rates,
      users,
      currencies,
      locations
    CASCADE
  `)
  const elapsed = performance.now() - start
  if (elapsed > 50) {
    console.log(`[TestContainer] cleanDatabase took ${elapsed.toFixed(1)}ms`)
  }
}

/**
 * Gets the current test database client.
 */
export function getTestDb(): TTestDrizzleClient | null {
  return db
}

// ============================================================================
// Transaction-based test isolation (FASTER alternative to cleanDatabase)
// ============================================================================

type TTestTransaction = {
  db: TTestDrizzleClient
  rollback: () => Promise<void>
}

/**
 * Begins a transaction for test isolation.
 * Use this instead of cleanDatabase for ~10x faster test cleanup.
 *
 * Usage in tests:
 * ```
 * let rollback: () => Promise<void>
 *
 * beforeEach(async () => {
 *   const tx = await beginTestTransaction()
 *   rollback = tx.rollback
 * })
 *
 * afterEach(async () => {
 *   await rollback()
 * })
 * ```
 */
export async function beginTestTransaction(): Promise<TTestTransaction> {
  if (!db || !client) {
    throw new Error('Database not initialized. Call startTestContainer() first.')
  }

  const start = performance.now()

  // Begin a transaction
  await db.execute(sql`BEGIN`)

  const rollback = async () => {
    const rollbackStart = performance.now()
    await db!.execute(sql`ROLLBACK`)
    const elapsed = performance.now() - rollbackStart
    if (elapsed > 10) {
      console.log(`[TestContainer] rollback took ${elapsed.toFixed(1)}ms`)
    }
  }

  const elapsed = performance.now() - start
  if (elapsed > 10) {
    console.log(`[TestContainer] beginTestTransaction took ${elapsed.toFixed(1)}ms`)
  }

  return { db, rollback }
}

/**
 * Alternative: Use a wrapper that automatically handles transaction lifecycle.
 * This is useful for tests that need transaction-based isolation.
 */
export async function withTestTransaction<T>(
  fn: (db: TTestDrizzleClient) => Promise<T>
): Promise<T> {
  const tx = await beginTestTransaction()
  try {
    return await fn(tx.db)
  } finally {
    await tx.rollback()
  }
}
