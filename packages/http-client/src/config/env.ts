import { z } from "zod";

const envSchema = z.object({
  apiBaseUrl: z.string().url(),
  apiTimeout: z.number().default(30000),
});

export type EnvConfig = z.infer<typeof envSchema>;

let cachedConfig: EnvConfig | null = null;

function isBrowser(): boolean {
  return typeof globalThis !== "undefined" && "window" in globalThis;
}

function getEnvValue(key: string): string | undefined {
  // Next.js (client-side uses NEXT_PUBLIC_ prefix)
  if (isBrowser()) {
    // Browser environment - check for Next.js public env vars
    const nextPublicKey = `NEXT_PUBLIC_${key}`;
    if (nextPublicKey in (process.env ?? {})) {
      return process.env[nextPublicKey];
    }
  }

  // Server-side Next.js or Expo
  // Expo uses EXPO_PUBLIC_ prefix for client-side env vars
  const expoKey = `EXPO_PUBLIC_${key}`;
  if (expoKey in (process.env ?? {})) {
    return process.env[expoKey];
  }

  // Direct env var (server-side)
  return process.env[key];
}

export function getEnvConfig(): EnvConfig {
  if (cachedConfig) {
    return cachedConfig;
  }

  const rawConfig = {
    apiBaseUrl: getEnvValue("API_BASE_URL") ?? "",
    apiTimeout: Number(getEnvValue("API_TIMEOUT")) || 30000,
  };

  const result = envSchema.safeParse(rawConfig);

  if (!result.success) {
    const errorMessage = result.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join(", ");
    throw new Error(`Invalid environment configuration: ${errorMessage}`);
  }

  cachedConfig = result.data;
  return cachedConfig;
}

export function setEnvConfig(config: Partial<EnvConfig>): void {
  const currentConfig = cachedConfig ?? {
    apiBaseUrl: "",
    apiTimeout: 30000,
  };

  const newConfig = { ...currentConfig, ...config };
  const result = envSchema.safeParse(newConfig);

  if (!result.success) {
    const errorMessage = result.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join(", ");
    throw new Error(`Invalid environment configuration: ${errorMessage}`);
  }

  cachedConfig = result.data;
}

export function resetEnvConfig(): void {
  cachedConfig = null;
}
