/**
 * Database Nuke Script
 *
 * Drops ALL objects from the database: tables, types, schemas, extensions.
 * Leaves the database completely empty, ready for `drizzle-kit migrate`.
 *
 * Safety features:
 * - Cannot run on production environment
 * - Requires typing the database name to confirm
 * - Requires typing "NUKE" to confirm
 *
 * Usage:
 *   bun scripts/db-nuke.ts
 */

import { Pool } from 'pg'
import * as readline from 'readline'

const DATABASE_URL = process.env.DATABASE_URL || ''

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

// ============================================================================
// Security Checks
// ============================================================================

const PRODUCTION_BLOCKLIST = [
  'prod',
  'production',
  'live',
  'main-db',
  'primary',
  'neon.tech',
  'supabase.co',
]

const SAFE_PATTERNS = [
  'localhost',
  '127.0.0.1',
  'dev',
  'development',
  'staging',
  'test',
  'local',
  'rlwy.net',
]

function parseDbUrl(url: string): { host: string; database: string; user: string } {
  try {
    const match = url.match(/postgresql:\/\/([^:]+):[^@]+@([^:\/]+)[:\d]*\/([^?]+)/)
    if (match) {
      return { user: match[1]!, host: match[2]!, database: match[3]! }
    }
  } catch {
    // Ignore parsing errors
  }
  return { host: 'unknown', database: 'unknown', user: 'unknown' }
}

function validateDatabaseUrl(url: string): boolean {
  const urlLower = url.toLowerCase()

  for (const blocked of PRODUCTION_BLOCKLIST) {
    if (urlLower.includes(blocked.toLowerCase())) {
      console.error(`\n  BLOCKED: URL contains "${blocked}" — cannot nuke production.\n`)
      return false
    }
  }

  if (!SAFE_PATTERNS.some(p => urlLower.includes(p.toLowerCase()))) {
    console.error(`\n  BLOCKED: URL does not contain a safe pattern (${SAFE_PATTERNS.join(', ')}).\n`)
    return false
  }

  return true
}

// ============================================================================
// Nuke Operations
// ============================================================================

async function nukeDatabase(databaseUrl: string): Promise<void> {
  const pool = new Pool({ connectionString: databaseUrl })

  try {
    console.log('\n  Nuking database...\n')

    // 1. Drop all tables in public schema
    const tablesResult = await pool.query(`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    `)
    if (tablesResult.rows.length > 0) {
      const tables = tablesResult.rows.map(r => `"${r.tablename}"`).join(', ')
      await pool.query(`DROP TABLE IF EXISTS ${tables} CASCADE`)
      console.log(`    Dropped ${tablesResult.rows.length} tables`)
    } else {
      console.log('    No tables to drop')
    }

    // 2. Drop all custom types/enums in public schema
    const typesResult = await pool.query(`
      SELECT typname FROM pg_type
      WHERE typnamespace = 'public'::regnamespace
        AND typtype = 'e'
    `)
    for (const row of typesResult.rows) {
      await pool.query(`DROP TYPE IF EXISTS "public"."${row.typname}" CASCADE`)
    }
    if (typesResult.rows.length > 0) {
      console.log(`    Dropped ${typesResult.rows.length} custom types`)
    } else {
      console.log('    No custom types to drop')
    }

    // 3. Drop non-default schemas (pgboss, drizzle, etc.)
    const schemasResult = await pool.query(`
      SELECT schema_name FROM information_schema.schemata
      WHERE schema_name NOT IN ('public', 'information_schema')
        AND schema_name NOT LIKE 'pg_%'
    `)
    for (const row of schemasResult.rows) {
      await pool.query(`DROP SCHEMA IF EXISTS "${row.schema_name}" CASCADE`)
      console.log(`    Dropped schema: ${row.schema_name}`)
    }
    if (schemasResult.rows.length === 0) {
      console.log('    No custom schemas to drop')
    }

    // 4. Drop all functions in public schema
    const funcsResult = await pool.query(`
      SELECT routines.routine_name, parameters.data_type
      FROM information_schema.routines
      LEFT JOIN information_schema.parameters ON routines.specific_name = parameters.specific_name
      WHERE routines.specific_schema = 'public'
    `)
    if (funcsResult.rows.length > 0) {
      await pool.query(`
        DO $$ DECLARE r RECORD;
        BEGIN
          FOR r IN (SELECT oid::regprocedure::text AS fn FROM pg_proc WHERE pronamespace = 'public'::regnamespace)
          LOOP EXECUTE 'DROP FUNCTION IF EXISTS ' || r.fn || ' CASCADE'; END LOOP;
        END $$;
      `)
      console.log('    Dropped custom functions')
    }

    console.log('\n  Database nuked successfully! It is now completely empty.')
    console.log('  Run `bun x drizzle-kit migrate` to recreate everything.\n')
  } finally {
    await pool.end()
  }
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  console.log('\n' + '='.repeat(60))
  console.log('  DATABASE NUKE SCRIPT')
  console.log('='.repeat(60))
  console.log('\n  This will DROP ALL OBJECTS (tables, types, schemas)')
  console.log('  from the database. This action is IRREVERSIBLE.\n')

  if (!DATABASE_URL) {
    console.error('  DATABASE_URL environment variable is not configured.\n')
    rl.close()
    process.exit(1)
  }

  if (!validateDatabaseUrl(DATABASE_URL)) {
    rl.close()
    process.exit(1)
  }

  const dbInfo = parseDbUrl(DATABASE_URL)

  console.log('  ' + '-'.repeat(50))
  console.log(`  Host: ${dbInfo.host}`)
  console.log(`  Database: ${dbInfo.database}`)
  console.log(`  User: ${dbInfo.user}`)
  console.log('  ' + '-'.repeat(50))

  console.log('\n  To confirm, type the database name exactly:')
  console.log(`  >>> ${dbInfo.database} <<<\n`)

  const confirm = await prompt('  Database name: ')
  if (confirm !== dbInfo.database) {
    console.log('\n  Database name does not match. Operation cancelled.\n')
    rl.close()
    process.exit(0)
  }

  const confirmNuke = await prompt('\n  Type "NUKE" to confirm total destruction: ')
  if (confirmNuke !== 'NUKE') {
    console.log('\n  Operation cancelled.\n')
    rl.close()
    process.exit(0)
  }

  try {
    await nukeDatabase(DATABASE_URL)
  } catch (error) {
    console.error('\n  Error during nuke:', error)
    process.exit(1)
  } finally {
    rl.close()
  }
}

main()
