/**
 * Reset Migrations Script
 *
 * Deletes all existing migration files and snapshots,
 * leaving a clean state for `drizzle-kit generate` to create a fresh migration.
 *
 * Usage:
 *   bun scripts/db-reset-migrations.ts
 */

import { readdirSync, unlinkSync, writeFileSync } from 'fs'
import { join } from 'path'

const DRIZZLE_DIR = join(import.meta.dir, '..', 'drizzle')
const META_DIR = join(DRIZZLE_DIR, 'meta')

const EMPTY_JOURNAL = {
  version: '7',
  dialect: 'postgresql',
  entries: [],
}

function main() {
  console.log('\n  Resetting migrations...\n')

  // 1. Delete all .sql migration files
  const sqlFiles = readdirSync(DRIZZLE_DIR).filter(f => f.endsWith('.sql'))
  for (const file of sqlFiles) {
    unlinkSync(join(DRIZZLE_DIR, file))
    console.log(`    Deleted: drizzle/${file}`)
  }

  // 2. Delete all snapshot files
  const snapshots = readdirSync(META_DIR).filter(f => f.endsWith('_snapshot.json'))
  for (const file of snapshots) {
    unlinkSync(join(META_DIR, file))
    console.log(`    Deleted: drizzle/meta/${file}`)
  }

  // 3. Reset journal
  writeFileSync(join(META_DIR, '_journal.json'), JSON.stringify(EMPTY_JOURNAL, null, 2) + '\n')
  console.log('    Reset:   drizzle/meta/_journal.json')

  console.log(`\n  Done! Removed ${sqlFiles.length} migrations and ${snapshots.length} snapshots.`)
  console.log('  Run `bun x drizzle-kit generate` to create a fresh migration.\n')
}

main()
