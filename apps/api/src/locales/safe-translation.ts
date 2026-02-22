import type { Context } from 'hono'
import { useTranslation } from '@intlify/hono'

/**
 * Safe wrapper around @intlify/hono's useTranslation.
 *
 * Handles a race condition bug in @intlify/hono@1.0.0 where the shared
 * i18n singleton's `locale` getter is reset to the raw unbound
 * `detectLocaleFromAcceptLanguageHeader` function when a concurrent
 * request completes. Subsequent `t()` calls then crash with
 * "Cannot read properties of undefined (reading 'req')".
 *
 * This wrapper catches the crash and falls back to the translation key's
 * last segment as a human-readable fallback (e.g. "insufficientRoles").
 */
export function safeTranslation(c: Context): (key: string) => string {
  try {
    const t = useTranslation(c)
    return (key: string) => {
      try {
        return t(key)
      } catch {
        return key.split('.').pop() || key
      }
    }
  } catch {
    return (key: string) => key.split('.').pop() || key
  }
}
