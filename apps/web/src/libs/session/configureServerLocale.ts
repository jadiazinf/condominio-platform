import { cookies } from 'next/headers'
import { setGlobalLocale } from '@packages/http-client'

const LOCALE_COOKIE = 'NEXT_LOCALE'
const DEFAULT_LOCALE = 'es'

let isConfigured = false

/**
 * Configures the http-client with the server-side locale getter.
 * This should be called once at app initialization to ensure
 * the Accept-Language header is included in API requests.
 *
 * The locale getter reads from cookies asynchronously for each request.
 */
export function configureServerLocale(): void {
  if (isConfigured) return

  setGlobalLocale(async () => {
    try {
      const cookieStore = await cookies()
      return cookieStore.get(LOCALE_COOKIE)?.value || DEFAULT_LOCALE
    } catch {
      // If cookies() fails (e.g., outside of request context), return default
      return DEFAULT_LOCALE
    }
  })

  isConfigured = true
}
