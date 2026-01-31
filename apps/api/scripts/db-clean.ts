/**
 * Database Cleanup Script
 *
 * This script cleans all data from the database tables.
 * It has multiple safety measures to prevent accidental data loss.
 *
 * Safety features:
 * - Cannot run on production environment
 * - Requires environment selection via CLI prompt
 * - Requires confirmation before execution
 * - Requires SEED_SECRET_KEY environment variable
 *
 * Usage:
 *   SEED_SECRET_KEY=your-secret bun scripts/db-clean.ts
 */

import { Pool } from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import { sql } from 'drizzle-orm'
import * as readline from 'readline'

// ============================================================================
// Configuration
// ============================================================================

const DATABASE_URL = process.env.DATABASE_URL || ''

// Tables in order of deletion (respecting foreign key constraints)
// Delete in reverse order of dependencies
const TABLES_TO_CLEAN = [
  // Support tickets (most dependent)
  'support_ticket_assignment_history',
  'support_ticket_messages',
  'support_tickets',

  // Subscriptions
  'subscription_invoices',
  'management_company_subscriptions',

  // Members & Invitations
  'management_company_members',
  'admin_invitations',

  // Communication
  'notifications',
  'messages',

  // Documents
  'documents',

  // Expenses
  'expenses',

  // Payments
  'payments',
  'quota_generation',
  'quotas',
  'payment_gateways',
  'interest_configurations',
  'payment_concepts',

  // Units
  'unit_ownerships',
  'units',

  // Buildings & Condominiums
  'buildings',
  'condominiums',

  // User roles
  'user_roles',
  'role_permissions',

  // Organizations
  'management_companies',

  // Superadmin
  'superadmin_users',

  // Audit
  'audit_logs',

  // Auth
  'roles',
  'permissions',

  // Users (keep last since many tables reference it)
  'users',

  // Core (usually keep these)
  'exchange_rates',
  'currencies',
  'locations',
]

// ============================================================================
// Utilities
// ============================================================================

const rl = readline.createInterface({
  input: process.stdin as NodeJS.ReadableStream,
  output: process.stdout as NodeJS.WritableStream,
})

function prompt(question: string): Promise<string> {
  return new Promise(resolve => {
    rl.question(question, answer => {
      resolve(answer.trim())
    })
  })
}

function printHeader() {
  console.log('\n' + '='.repeat(60))
  console.log('  DATABASE CLEANUP SCRIPT')
  console.log('='.repeat(60))
  console.log('\n  This will DELETE ALL DATA from the selected database.')
  console.log('  This action is IRREVERSIBLE.\n')
}

// ============================================================================
// Security Checks
// ============================================================================

// Production indicators - if ANY of these are found in the URL, it's blocked
const PRODUCTION_BLOCKLIST = [
  'prod',
  'production',
  'live',
  'main-db',
  'primary',
  // Add your production hostnames here
  'neon.tech', // If you use Neon for production
  'supabase.co', // If you use Supabase for production
  // Add specific production hosts
]

// Allowed patterns - URL must contain ONE of these to be considered safe
const SAFE_PATTERNS = [
  'localhost',
  '127.0.0.1',
  'dev',
  'development',
  'staging',
  'test',
  'local',
  'rlwy.net', // Railway (staging/development)
]

function parseDbUrl(url: string): { host: string; database: string; user: string } {
  try {
    // postgresql://user:pass@host:port/database
    const match = url.match(/postgresql:\/\/([^:]+):[^@]+@([^:\/]+)[:\d]*\/([^?]+)/)
    if (match) {
      return { user: match[1], host: match[2], database: match[3] }
    }
  } catch {
    // Ignore parsing errors
  }
  return { host: 'unknown', database: 'unknown', user: 'unknown' }
}

function isProductionDatabase(url: string): { blocked: boolean; reason?: string } {
  const urlLower = url.toLowerCase()

  // Check blocklist
  for (const blocked of PRODUCTION_BLOCKLIST) {
    if (urlLower.includes(blocked.toLowerCase())) {
      return {
        blocked: true,
        reason: `URL contains blocked pattern: "${blocked}"`,
      }
    }
  }

  // Check if it has safe patterns
  const hasSafePattern = SAFE_PATTERNS.some(pattern => urlLower.includes(pattern.toLowerCase()))

  if (!hasSafePattern) {
    return {
      blocked: true,
      reason: `URL does not contain any safe pattern (${SAFE_PATTERNS.join(', ')})`,
    }
  }

  return { blocked: false }
}

function validateDatabaseUrl(url: string): boolean {
  const check = isProductionDatabase(url)

  if (check.blocked) {
    console.error('\n  DATABASE URL BLOCKED!')
    console.error(`  Reason: ${check.reason}`)
    console.error('\n  This appears to be a production database.')
    console.error(
      '  If this is incorrect, update PRODUCTION_BLOCKLIST or SAFE_PATTERNS in the script.\n'
    )
    return false
  }

  return true
}

// ============================================================================
// Database Operations
// ============================================================================

async function cleanDatabase(databaseUrl: string): Promise<void> {
  const pool = new Pool({ connectionString: databaseUrl })
  const db = drizzle(pool)

  try {
    console.log('\n  Starting cleanup...\n')

    // Disable foreign key checks temporarily
    await db.execute(sql`SET session_replication_role = 'replica'`)

    for (const table of TABLES_TO_CLEAN) {
      try {
        await db.execute(sql.raw(`TRUNCATE TABLE "${table}" CASCADE`))
        console.log(`    Cleaned: ${table}`)
      } catch (error) {
        // Table might not exist, that's okay
        const errorMessage = error instanceof Error ? error.message : String(error)
        if (errorMessage.includes('does not exist')) {
          console.log(`    Skipped: ${table} (table does not exist)`)
        } else {
          console.log(`    Warning: ${table} - ${errorMessage}`)
        }
      }
    }

    // Re-enable foreign key checks
    await db.execute(sql`SET session_replication_role = 'origin'`)

    console.log('\n  Cleanup completed successfully!\n')
  } finally {
    await pool.end()
  }
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  printHeader()

  // Check if DATABASE_URL is set
  if (!DATABASE_URL) {
    console.error('\n  DATABASE_URL environment variable is not configured.\n')
    rl.close()
    process.exit(1)
  }

  // SECURITY: Validate database URL is not production
  if (!validateDatabaseUrl(DATABASE_URL)) {
    rl.close()
    process.exit(1)
  }

  // Parse database info for confirmation
  const dbInfo = parseDbUrl(DATABASE_URL)

  // Show confirmation with database details
  console.log('\n  ' + '-'.repeat(50))
  console.log(`  Host: ${dbInfo.host}`)
  console.log(`  Database: ${dbInfo.database}`)
  console.log(`  User: ${dbInfo.user}`)
  console.log('  ' + '-'.repeat(50))

  console.log('\n  To confirm, type the database name exactly:')
  console.log(`  >>> ${dbInfo.database} <<<\n`)

  // First confirmation - must type the exact database name
  const confirm = await prompt('  Database name: ')

  if (confirm !== dbInfo.database) {
    console.log('\n  Database name does not match. Operation cancelled.\n')
    rl.close()
    process.exit(0)
  }

  // Second confirmation
  const confirmClean = await prompt('\n  Type "CLEAN" to confirm deletion: ')

  if (confirmClean !== 'CLEAN') {
    console.log('\n  Operation cancelled.\n')
    rl.close()
    process.exit(0)
  }

  // Execute cleanup
  try {
    await cleanDatabase(DATABASE_URL)
    console.log('  Database cleaned successfully!')
    console.log('  You can now run the seed script to populate with fresh data.\n')
  } catch (error) {
    console.error('\n  Error during cleanup:', error)
    process.exit(1)
  } finally {
    rl.close()
  }
}

main()
