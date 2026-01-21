import { z, treeifyError } from 'zod'
import logger from '@utils/logger'

const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'staging', 'test'], {
      error: "NODE_ENV must be one of 'development', 'production', or 'staging'.",
    })
    .default('development'),
  HOST: z.string().default('localhost'),
  PORT: z.coerce.number().min(1).max(65535).default(3000),
  DATABASE_URL: z.url(
    'Database URL must be a valid URL. Maybe is not defined as an environment variable?'
  ),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  CORS_ORIGIN: z.string().optional(),
  FIREBASE_API_KEY: z.string('Firebase API key must be provided'),
  FIREBASE_SERVICE_ACCOUNT_BASE64: z.string().optional(),
})

// In test mode, use a more lenient validation
const isTestMode = Bun.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'test'

let env: z.infer<typeof envSchema>

if (isTestMode) {
  // In test mode, provide defaults for missing values
  const testDefaults = {
    NODE_ENV: 'test' as const,
    HOST: 'localhost',
    PORT: 3000,
    DATABASE_URL:
      Bun.env.DATABASE_URL ||
      process.env.DATABASE_URL ||
      'postgresql://test:test@localhost:5432/test',
    LOG_LEVEL: 'error' as const,
    CORS_ORIGIN: undefined,
    FIREBASE_API_KEY: Bun.env.FIREBASE_API_KEY || process.env.FIREBASE_API_KEY || 'test-api-key',
    FIREBASE_SERVICE_ACCOUNT_BASE64: undefined,
  }
  env = testDefaults
} else {
  const parsed = envSchema.safeParse(Bun.env)

  if (!parsed.success) {
    logger.error('❌ Failed to validate environment variables')

    const errorTree = treeifyError(parsed.error)
    if (errorTree.properties) {
      for (const [key, value] of Object.entries(errorTree.properties)) {
        value.errors.forEach(msg => {
          logger.error(`${key}: ${msg}`)
        })
      }
    }

    process.exit(1)
  }

  env = parsed.data
}

export { env }
