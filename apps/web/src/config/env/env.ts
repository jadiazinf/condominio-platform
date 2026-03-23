import { envSchema, type EnvSchema } from './env.schema'

/**
 * Loads NEXT_PUBLIC_* and NODE_ENV vars using **static** property access.
 * Next.js inlines `process.env.NEXT_PUBLIC_*` at build time for client bundles,
 * but only when accessed as a literal dot-property — NOT via dynamic bracket access.
 *
 * Server-only vars (FIREBASE_ADMIN_*, FIREBASE_SERVICE_ACCOUNT_*) are loaded
 * dynamically and are only available on the server.
 */
function loadStaticEnv(): Record<string, unknown> {
  const raw: Record<string, unknown> = {}

  // --- Inlined by Next.js bundler (works on client AND server) ---
  raw.NODE_ENV = process.env.NODE_ENV

  // API
  raw.NEXT_PUBLIC_API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL
  raw.NEXT_PUBLIC_API_TIMEOUT = process.env.NEXT_PUBLIC_API_TIMEOUT

  // App
  raw.NEXT_PUBLIC_APP_NAME = process.env.NEXT_PUBLIC_APP_NAME
  raw.NEXT_PUBLIC_APP_URL = process.env.NEXT_PUBLIC_APP_URL
  raw.NEXT_PUBLIC_BASE_URL = process.env.NEXT_PUBLIC_BASE_URL

  // Firebase (Client)
  raw.NEXT_PUBLIC_FIREBASE_API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY
  raw.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
  raw.NEXT_PUBLIC_FIREBASE_PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  raw.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
  raw.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID =
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
  raw.NEXT_PUBLIC_FIREBASE_APP_ID = process.env.NEXT_PUBLIC_FIREBASE_APP_ID
  raw.NEXT_PUBLIC_FIREBASE_VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY

  // SEO
  raw.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION

  // Feature flags
  raw.NEXT_PUBLIC_ENABLE_ANALYTICS = process.env.NEXT_PUBLIC_ENABLE_ANALYTICS

  // --- Server-only vars (dynamic access, NOT inlined by bundler) ---
  if (typeof window === 'undefined') {
    raw.FIREBASE_SERVICE_ACCOUNT_BASE64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64
    raw.FIREBASE_SERVICE_ACCOUNT_PATH = process.env.FIREBASE_SERVICE_ACCOUNT_PATH
    raw.FIREBASE_ADMIN_PROJECT_ID = process.env.FIREBASE_ADMIN_PROJECT_ID
    raw.FIREBASE_ADMIN_CLIENT_EMAIL = process.env.FIREBASE_ADMIN_CLIENT_EMAIL
    raw.FIREBASE_ADMIN_PRIVATE_KEY = process.env.FIREBASE_ADMIN_PRIVATE_KEY
  }

  // Remove undefined entries so Zod defaults kick in
  for (const key of Object.keys(raw)) {
    if (raw[key] === undefined) {
      delete raw[key]
    }
  }

  return raw
}

/**
 * Zod schema for client-side validation — only includes vars
 * that are available on the client (NEXT_PUBLIC_* and NODE_ENV).
 * Server-only vars are all optional in the full schema, so omitting
 * them won't cause validation errors.
 */

class Env {
  private static instance: Env | null = null
  private config: EnvSchema | null = null
  private initialized = false

  private constructor() {}

  static getInstance(): Env {
    if (!Env.instance) {
      Env.instance = new Env()
    }

    return Env.instance
  }

  private validate(raw: Record<string, unknown>): EnvSchema {
    const result = envSchema.safeParse(raw)

    if (!result.success) {
      const missingVars: string[] = []
      const invalidVars: string[] = []

      for (const issue of result.error.issues) {
        const key = issue.path.join('.')

        // Check if the variable is missing (value is undefined in raw object)
        if (issue.code === 'invalid_type' && raw[key] === undefined) {
          missingVars.push(key)
        } else {
          invalidVars.push(`${key}: ${issue.message}`)
        }
      }

      let errorMessage = 'Error de configuración de variables de entorno:\n'

      if (missingVars.length > 0) {
        errorMessage += `\n Variables faltantes:\n  - ${missingVars.join('\n  - ')}`
      }

      if (invalidVars.length > 0) {
        errorMessage += `\n Variables inválidas:\n  - ${invalidVars.join('\n  - ')}`
      }

      throw new Error(errorMessage)
    }

    return result.data
  }

  init(): void {
    if (this.initialized) {
      return
    }

    const raw = loadStaticEnv()

    this.config = this.validate(raw)
    this.initialized = true
  }

  get<K extends keyof EnvSchema>(key: K): EnvSchema[K] {
    if (!this.initialized || !this.config) {
      this.init()
    }

    return this.config![key]
  }

  getAll(): Readonly<EnvSchema> {
    if (!this.initialized || !this.config) {
      this.init()
    }

    return Object.freeze({ ...this.config! })
  }

  isInitialized(): boolean {
    return this.initialized
  }
}

export const env = Env.getInstance()
