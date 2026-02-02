import { z, treeifyError } from 'zod'
import logger from '@utils/logger'

// ─────────────────────────────────────────────────────────────────────────────
// Environment Variables Schema
// ─────────────────────────────────────────────────────────────────────────────

const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'staging', 'test'], {
      error: "NODE_ENV must be one of 'development', 'production', 'staging' or 'test'.",
    })
    .default('development'),
  HOST: z.string().default('localhost'),
  PORT: z.coerce.number().min(1).max(65535).default(3000),
  DATABASE_URL: z.url(
    'DATABASE_URL must be a valid URL. Maybe is not defined as an environment variable?'
  ),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  CORS_ORIGIN: z.string().optional(),
  FIREBASE_API_KEY: z.string('FIREBASE_API_KEY must be provided'),
  FIREBASE_SERVICE_ACCOUNT_BASE64: z.string().optional(),
  // Resend (Email)
  RESEND_API_KEY: z.string().optional(),
  RESEND_FROM_EMAIL: z.string().optional().default('Condominio App <noreply@resend.dev>'),
  APP_URL: z.url('APP_URL must be a valid URL'),
  // Superadmin
  SUPERADMIN_EMAIL_DOMAIN: z.string().optional().default('@latorre.com'),
})

// ─────────────────────────────────────────────────────────────────────────────
// Required Variables Configuration
// ─────────────────────────────────────────────────────────────────────────────

interface IRequiredVar {
  key: string
  envKey: keyof z.infer<typeof envSchema>
  description: string
  /** If true, only required in production/staging (not development) */
  productionOnly?: boolean
}

/**
 * Variables that MUST be set. Some are required in all environments,
 * others only in production/staging.
 */
const REQUIRED_VARIABLES: IRequiredVar[] = [
  // Required in ALL environments (including development)
  {
    key: 'DATABASE_URL',
    envKey: 'DATABASE_URL',
    description: 'Database connection URL',
  },
  {
    key: 'FIREBASE_API_KEY',
    envKey: 'FIREBASE_API_KEY',
    description: 'Firebase API key for client SDK',
  },
  // Required only in production/staging
  {
    key: 'RESEND_API_KEY',
    envKey: 'RESEND_API_KEY',
    description: 'Required for sending emails (invitations, notifications)',
    productionOnly: true,
  },
  {
    key: 'APP_URL',
    envKey: 'APP_URL',
    description: 'Base URL of the web application (must NOT be localhost)',
    productionOnly: true,
  },
  {
    key: 'FIREBASE_SERVICE_ACCOUNT_BASE64',
    envKey: 'FIREBASE_SERVICE_ACCOUNT_BASE64',
    description: 'Firebase Admin SDK credentials (base64 encoded)',
    productionOnly: true,
  },
]

/**
 * Validates that all required environment variables are set.
 * - In development: only validates core variables (DATABASE_URL, FIREBASE_API_KEY)
 * - In production/staging: validates ALL required variables including APP_URL (must not be localhost)
 */
function validateRequiredEnv(parsedEnv: z.infer<typeof envSchema>): void {
  const isDevelopment = parsedEnv.NODE_ENV === 'development'
  const missingVars: string[] = []

  for (const { key, envKey, description, productionOnly } of REQUIRED_VARIABLES) {
    // Skip production-only variables in development
    if (productionOnly && isDevelopment) {
      continue
    }

    const value = parsedEnv[envKey]

    // Check if value is missing or empty
    let isMissing = !value

    // In production/staging, APP_URL must NOT be localhost
    if (!isDevelopment && envKey === 'APP_URL' && typeof value === 'string') {
      const isLocalhost = value.includes('localhost') || value.includes('127.0.0.1')
      if (isLocalhost) {
        isMissing = true
      }
    }

    if (isMissing) {
      missingVars.push(`  - ${key}: ${description}`)
    }
  }

  if (missingVars.length > 0) {
    const envLabel = isDevelopment ? 'DEVELOPMENT' : parsedEnv.NODE_ENV.toUpperCase()
    const errorMessage = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
❌ MISSING REQUIRED ENVIRONMENT VARIABLES FOR ${envLabel}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

The following environment variables are required:

${missingVars.join('\n')}

Please set these variables in your environment (e.g., Railway, .env file).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`
    logger.error(errorMessage)
    const varNames = missingVars.map(v => v.split(':')[0]?.trim().replace('- ', '') ?? 'unknown')
    throw new Error(`Missing required environment variables: ${varNames.join(', ')}`)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Environment Initialization
// ─────────────────────────────────────────────────────────────────────────────

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
    RESEND_API_KEY: undefined,
    RESEND_FROM_EMAIL: 'Condominio App <noreply@resend.dev>',
    APP_URL: 'http://localhost:3000',
    SUPERADMIN_EMAIL_DOMAIN: '@latorre.com',
  }
  env = testDefaults
} else {
  // Parse and validate schema
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

  // Validate required variables in all environments (development, staging, production)
  validateRequiredEnv(env)
}

export { env }
