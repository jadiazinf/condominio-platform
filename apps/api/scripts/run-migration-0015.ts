#!/usr/bin/env bun
import postgres from 'postgres'
import { readFileSync } from 'fs'
import { join } from 'path'

const DATABASE_URL = process.env.DATABASE_URL

if (!DATABASE_URL) {
  console.error('DATABASE_URL is not set')
  process.exit(1)
}

async function runMigration() {
  const queryClient = postgres(DATABASE_URL!)

  try {
    console.log('Reading migration file...')
    const migrationSQL = readFileSync(
      join(import.meta.dir, '../src/database/drizzle/migrations/0015_add_concept_id_to_service_executions.sql'),
      'utf-8'
    )

    console.log('Executing migration...')
    await queryClient.unsafe(migrationSQL)

    console.log('✅ Migration 0015 completed successfully!')
  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  } finally {
    await queryClient.end()
  }
}

runMigration()
