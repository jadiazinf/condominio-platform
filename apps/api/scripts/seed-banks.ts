/**
 * Standalone Banks Seed Script
 *
 * Seeds the banks catalog table with Venezuelan and international banks.
 * Safe to run multiple times (uses ON CONFLICT DO NOTHING).
 *
 * Usage:
 *   cd apps/api && bun scripts/seed-banks.ts
 */

import { Pool } from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import * as schema from '../src/database/drizzle/schema'
import { seedBanks } from '../src/database/seeds/banks.seed'

const DATABASE_URL = process.env.DATABASE_URL || ''

if (!DATABASE_URL) {
  console.error('DATABASE_URL environment variable is not configured.')
  process.exit(1)
}

async function main() {
  const pool = new Pool({ connectionString: DATABASE_URL })
  const db = drizzle(pool, { schema })

  try {
    await seedBanks(db as any)
    console.log('Done.')
  } catch (error) {
    console.error('Error seeding banks:', error)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

main()
