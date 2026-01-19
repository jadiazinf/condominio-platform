import { z } from 'zod'

const envSchema = z.object({
  apiBaseUrl: z.string().url(),
  apiTimeout: z.number().default(30000),
})

export type EnvConfig = z.infer<typeof envSchema>

let cachedConfig: EnvConfig | null = null

// Next.js replaces NEXT_PUBLIC_* variables at build time, so we must access them
// with their full literal names - dynamic access like process.env[varName] won't work.
// This function provides the raw env values for each supported platform.
function getApiBaseUrl(): string {
  // Next.js (must be literal for build-time replacement)
  if (process.env.NEXT_PUBLIC_API_BASE_URL) {
    return process.env.NEXT_PUBLIC_API_BASE_URL
  }

  // Expo
  if (process.env.EXPO_PUBLIC_API_BASE_URL) {
    return process.env.EXPO_PUBLIC_API_BASE_URL
  }

  // Server-side / direct
  return process.env.API_BASE_URL ?? ''
}

function getApiTimeout(): number {
  // Next.js
  if (process.env.NEXT_PUBLIC_API_TIMEOUT) {
    return Number(process.env.NEXT_PUBLIC_API_TIMEOUT) || 30000
  }

  // Expo
  if (process.env.EXPO_PUBLIC_API_TIMEOUT) {
    return Number(process.env.EXPO_PUBLIC_API_TIMEOUT) || 30000
  }

  // Server-side / direct
  return Number(process.env.API_TIMEOUT) || 30000
}

export function getEnvConfig(): EnvConfig {
  if (cachedConfig) {
    return cachedConfig
  }

  const rawConfig = {
    apiBaseUrl: getApiBaseUrl(),
    apiTimeout: getApiTimeout(),
  }

  const result = envSchema.safeParse(rawConfig)

  if (!result.success) {
    const errorMessage = result.error.issues
      .map(issue => `${issue.path.join('.')}: ${issue.message}`)
      .join(', ')
    throw new Error(`Invalid environment configuration: ${errorMessage}`)
  }

  cachedConfig = result.data
  return cachedConfig
}

export function setEnvConfig(config: Partial<EnvConfig>): void {
  const currentConfig = cachedConfig ?? {
    apiBaseUrl: '',
    apiTimeout: 30000,
  }

  const newConfig = { ...currentConfig, ...config }
  const result = envSchema.safeParse(newConfig)

  if (!result.success) {
    const errorMessage = result.error.issues
      .map(issue => `${issue.path.join('.')}: ${issue.message}`)
      .join(', ')
    throw new Error(`Invalid environment configuration: ${errorMessage}`)
  }

  cachedConfig = result.data
}

export function resetEnvConfig(): void {
  cachedConfig = null
}
