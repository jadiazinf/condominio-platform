/**
 * Standalone Charge Categories Seed Script
 *
 * Seeds the charge_categories table with default charge categories.
 * Safe to run multiple times (uses ON CONFLICT DO NOTHING).
 *
 * Usage:
 *   cd apps/api && bun scripts/seed-charge-categories.ts
 */

import { Pool } from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import * as schema from '@database/drizzle/schema'
import { seedChargeCategories } from '../src/database/seeds/charge-categories.seed'

const DATABASE_URL = process.env.DATABASE_URL || ''

if (!DATABASE_URL) {
  console.error('DATABASE_URL environment variable is not configured.')
  process.exit(1)
}

async function main() {
  const pool = new Pool({ connectionString: DATABASE_URL })
  const db = drizzle(pool, { schema })

  try {
    await seedChargeCategories(db as any)
    console.log('Done.')
  } catch (error) {
    console.error('Error seeding charge categories:', error)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

main()
