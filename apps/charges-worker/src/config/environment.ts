import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'staging', 'test'])
    .default('development'),
  DATABASE_URL: z.url('DATABASE_URL must be a valid URL'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  // Resend (Email) - needed for notification processor
  RESEND_API_KEY: z.string().optional(),
  RESEND_FROM_EMAIL: z.string().optional().default('Condo App <noreply@resend.dev>'),
  // Firebase - needed for push notifications via FCM
  FIREBASE_API_KEY: z.string('FIREBASE_API_KEY must be provided'),
  FIREBASE_SERVICE_ACCOUNT_BASE64: z.string().optional(),
})

const parsed = envSchema.safeParse(Bun.env)

if (!parsed.success) {
  console.error('Failed to validate charges-worker environment variables:')
  console.error(parsed.error.format())
  process.exit(1)
}

// In production/staging, FIREBASE_SERVICE_ACCOUNT_BASE64 is required
const isProduction = parsed.data.NODE_ENV === 'production' || parsed.data.NODE_ENV === 'staging'
if (isProduction && !parsed.data.FIREBASE_SERVICE_ACCOUNT_BASE64) {
  console.error('FIREBASE_SERVICE_ACCOUNT_BASE64 is required in production/staging')
  process.exit(1)
}

export const env = parsed.data
