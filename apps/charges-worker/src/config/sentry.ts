import * as Sentry from '@sentry/bun'
import { env } from './environment'

/**
 * Initializes Sentry for the charges worker.
 * Only active when SENTRY_DSN is configured.
 */
export function initSentry() {
  if (!env.SENTRY_DSN) return

  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.NODE_ENV,
    tracesSampleRate: env.NODE_ENV === 'production' ? 0.2 : 1.0,
    serverName: 'charges-worker',
  })
}

export { Sentry }
