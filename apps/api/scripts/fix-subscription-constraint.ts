#!/usr/bin/env bun
import { DatabaseService } from '../src/database/service'
import { readFileSync } from 'fs'
import { join } from 'path'

async function main() {
  try {
    console.log('🔧 Fixing subscription unique constraint...')

    const db = DatabaseService.getInstance().getDb()

    // Read the migration SQL
    const migrationPath = join(__dirname, '../src/database/drizzle/migrations/0007_fix_subscription_unique_constraint.sql')
    const sql = readFileSync(migrationPath, 'utf-8')

    // Execute the migration
    await db.execute(sql)

    console.log('✅ Migration applied successfully!')
    console.log('The subscription unique constraint now only applies to active and trial statuses.')
    console.log('Multiple cancelled subscriptions per company are now allowed.')

    process.exit(0)
  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  }
}

main()
