import * as Sentry from '@sentry/bun'
import { env } from './environment'

/**
 * Initializes Sentry for the API server.
 * Only active when SENTRY_DSN is configured.
 */
export function initSentry() {
  if (!env.SENTRY_DSN) return

  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.NODE_ENV,
    tracesSampleRate: env.NODE_ENV === 'production' ? 0.2 : 1.0,
    beforeSend(event) {
      // Strip sensitive data
      if (event.request?.headers) {
        delete event.request.headers['authorization']
        delete event.request.headers['cookie']
      }
      return event
    },
  })
}

export { Sentry }
