import { execSync } from 'child_process'

console.log('[startup] Running database migrations...')
try {
  execSync('bun x drizzle-kit migrate', { stdio: 'inherit', cwd: import.meta.dir + '/..' })
  console.log('[startup] Migrations completed successfully')
} catch (error) {
  console.error('[startup] Migration failed:', error)
  process.exit(1)
}

console.log('[startup] Starting API server...')
await import('../src/main.ts')
