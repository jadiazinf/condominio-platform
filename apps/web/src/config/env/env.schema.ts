import { z } from 'zod'

export const envSchema = z.object({
  // API
  NEXT_PUBLIC_API_BASE_URL: z.string().url('API_BASE_URL debe ser una URL válida'),
  NEXT_PUBLIC_API_TIMEOUT: z.coerce.number().default(30000),

  // App
  NEXT_PUBLIC_APP_NAME: z.string().default('CondominioApp'),
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),

  // Firebase (Client)
  NEXT_PUBLIC_FIREBASE_API_KEY: z.string(),
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: z.string(),
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: z.string(),
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: z.string().optional(),
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: z.string().optional(),
  NEXT_PUBLIC_FIREBASE_APP_ID: z.string(),

  // Firebase Admin (Server-only)
  FIREBASE_ADMIN_PROJECT_ID: z.string().optional(),
  FIREBASE_ADMIN_CLIENT_EMAIL: z.email().optional(),
  FIREBASE_ADMIN_PRIVATE_KEY: z.string().optional(),

  // Feature flags (ejemplo)
  NEXT_PUBLIC_ENABLE_ANALYTICS: z.coerce.boolean().default(false),
})

export type EnvSchema = z.infer<typeof envSchema>

export const envKeys = envSchema.keyof().options
export type EnvKey = keyof EnvSchema
