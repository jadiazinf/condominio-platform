/**
 * Database Rebuild Script
 *
 * Full database rebuild pipeline:
 *   1. Nuke the database (drop all objects)
 *   2. Reset migrations (delete old files, reset journal)
 *   3. Generate a fresh migration from current schema
 *   4. Apply the migration
 *   5. Run the seed
 *
 * Safety: inherits all safety checks from db-nuke (production blocklist, confirmations).
 *
 * Usage:
 *   bun scripts/db-rebuild.ts
 */

import { execSync } from 'child_process'

const SCRIPTS_DIR = import.meta.dir
const API_DIR = `${SCRIPTS_DIR}/..`

function run(label: string, command: string) {
  console.log(`\n${'='.repeat(60)}`)
  console.log(`  Step: ${label}`)
  console.log('='.repeat(60))
  execSync(command, { stdio: 'inherit', cwd: API_DIR })
}

async function main() {
  console.log('\n' + '='.repeat(60))
  console.log('  DATABASE REBUILD PIPELINE')
  console.log('='.repeat(60))
  console.log('\n  This will: nuke DB, reset migrations, generate, migrate, seed.')
  console.log('  You will be prompted for confirmation during the nuke step.\n')

  try {
    // 1. Nuke — drops all tables, types, schemas (has its own confirmation prompts)
    run('Nuke database', 'bun scripts/db-nuke.ts')

    // 2. Reset migrations — deletes old .sql and snapshots, resets journal
    run('Reset migrations', 'bun scripts/db-reset-migrations.ts')

    // 3. Generate — creates a single fresh migration from current schema
    run('Generate migration', 'bun x drizzle-kit generate')

    // 4. Migrate — applies the fresh migration to the empty database
    run('Apply migration', 'bun x drizzle-kit migrate')

    // 5. Seed — populates with initial data
    run('Seed database', 'bun scripts/db-seed.ts')

    // 6. Seed charge categories
    run('Seed charge categories', 'bun scripts/seed-charge-categories.ts')

    console.log('\n' + '='.repeat(60))
    console.log('  DATABASE REBUILD COMPLETE')
    console.log('='.repeat(60) + '\n')
  } catch (error) {
    console.error('\n  Rebuild failed. Check the output above for details.\n')
    process.exit(1)
  }
}

main()
