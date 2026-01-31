#!/usr/bin/env bun
/**
 * Validates that DATABASE_URL points to localhost before running dev server.
 * This prevents accidentally connecting to staging/production databases during development.
 */

import { spawn } from 'bun'

const LOCALHOST_PATTERNS = ['localhost', '127.0.0.1']

function checkDatabaseUrl(): boolean {
  const databaseUrl = process.env.DATABASE_URL

  if (!databaseUrl) {
    console.error('\x1b[31m[ERROR]\x1b[0m DATABASE_URL is not set in .env file')
    return false
  }

  const isLocalhost = LOCALHOST_PATTERNS.some((pattern) => databaseUrl.includes(pattern))

  if (!isLocalhost) {
    console.error('\x1b[31m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m')
    console.error('\x1b[31m[ERROR]\x1b[0m DATABASE_URL does not point to localhost!')
    console.error('')
    console.error('  Current URL contains: \x1b[33m' + new URL(databaseUrl).host + '\x1b[0m')
    console.error('')
    console.error('  For development, DATABASE_URL must contain "localhost" or "127.0.0.1".')
    console.error('  Please update your .env file to use a local database.')
    console.error('')
    console.error('  If you need to connect to a remote database, use:')
    console.error('    \x1b[36mbun run start\x1b[0m (without the localhost check)')
    console.error('\x1b[31m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m')
    return false
  }

  console.log('\x1b[32m[OK]\x1b[0m DATABASE_URL points to localhost')
  return true
}

async function main() {
  const isValid = checkDatabaseUrl()

  if (!isValid) {
    process.exit(1)
  }

  // Run the dev server
  const proc = spawn(['bun', 'run', '--watch', 'src/main.ts'], {
    cwd: import.meta.dir + '/..',
    stdout: 'inherit',
    stderr: 'inherit',
    stdin: 'inherit',
  })

  await proc.exited
}

main()
