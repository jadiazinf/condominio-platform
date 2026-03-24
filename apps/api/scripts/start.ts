/**
 * Startup script for the API server.
 * Runs database migrations BEFORE starting the server.
 *
 * drizzle-kit migrate is idempotent — it reads the __drizzle_migrations table
 * and only applies migrations that haven't been run yet. If there are no new
 * migrations, it does nothing. This is safe to run on every deploy.
 */
import { execSync } from 'child_process'

const MAX_RETRIES = 5
const RETRY_DELAY_MS = 3000

async function waitForDatabase(): Promise<void> {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      // Use drizzle-kit migrate which will also test the DB connection
      console.log(`[startup] Running database migrations (attempt ${attempt}/${MAX_RETRIES})...`)
      execSync('bun x drizzle-kit migrate', {
        stdio: 'inherit',
        cwd: import.meta.dir + '/..',
        timeout: 30_000,
      })
      console.log('[startup] Migrations completed successfully')
      return
    } catch (error) {
      if (attempt === MAX_RETRIES) {
        console.error(`[startup] Migration failed after ${MAX_RETRIES} attempts:`, error)
        process.exit(1)
      }
      console.warn(
        `[startup] Migration attempt ${attempt} failed, retrying in ${RETRY_DELAY_MS}ms...`
      )
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS))
    }
  }
}

await waitForDatabase()

console.log('[startup] Starting API server...')
await import('../src/main.ts')
