import { envSchema, type EnvSchema, envKeys } from './env.schema'

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

  private loadFromProcessEnv(): Record<string, unknown> {
    const raw: Record<string, unknown> = {}

    for (const key of envKeys) {
      const value = process.env[key]

      if (value !== undefined) {
        raw[key] = value
      }
    }

    return raw
  }

  private validate(raw: Record<string, unknown>): EnvSchema {
    const result = envSchema.safeParse(raw)

    if (!result.success) {
      const missingVars: string[] = []
      const invalidVars: string[] = []

      for (const issue of result.error.issues) {
        const key = issue.path.join('.')

        if (issue.code === 'invalid_type' && issue.received === 'undefined') {
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

    const raw = this.loadFromProcessEnv()

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
