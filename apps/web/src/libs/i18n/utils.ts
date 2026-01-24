type TMessages = Record<string, unknown>

/**
 * Deep merges two objects, with source values overwriting target values.
 */
export function deepMerge<T extends TMessages>(target: T, source: TMessages): T {
  const result = { ...target } as TMessages

  for (const key of Object.keys(source)) {
    if (
      source[key] &&
      typeof source[key] === 'object' &&
      !Array.isArray(source[key]) &&
      target[key] &&
      typeof target[key] === 'object' &&
      !Array.isArray(target[key])
    ) {
      result[key] = deepMerge(target[key] as TMessages, source[key] as TMessages)
    } else {
      result[key] = source[key]
    }
  }

  return result as T
}

/**
 * Gets a nested value from an object using dot notation path.
 */
export function getNestedValue(obj: TMessages, path: string): string | undefined {
  const keys = path.split('.')
  let current: unknown = obj

  for (const key of keys) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined
    }
    current = (current as TMessages)[key]
  }

  return typeof current === 'string' ? current : undefined
}

const LOCALE_COOKIE = 'NEXT_LOCALE'

/**
 * Gets the locale cookie value.
 */
export function getLocaleCookie(): string | undefined {
  if (typeof document === 'undefined') return undefined
  const value = `; ${document.cookie}`
  const parts = value.split(`; ${LOCALE_COOKIE}=`)

  if (parts.length === 2) {
    return parts.pop()?.split(';').shift()
  }

  return undefined
}

/**
 * Sets the locale cookie value.
 */
export function setLocaleCookie(value: string, days: number = 365): void {
  if (typeof document === 'undefined') return
  const expires = new Date()

  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000)
  document.cookie = `${LOCALE_COOKIE}=${value};expires=${expires.toUTCString()};path=/;SameSite=Lax`
}
