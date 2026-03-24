import type { Hono } from 'hono'
import { Sentry } from '@config/sentry'

/**
 * Sentry enrichment middleware.
 * Wraps each request in an isolated Sentry scope and enriches with
 * request context. Auth context (userId, condominiumId) is added
 * in the error handler since it's available after auth middleware runs.
 *
 * Must be registered BEFORE the error handler.
 */
export function applySentryMiddleware(app: Hono) {
  app.use('*', async (c, next) => {
    Sentry.getCurrentScope().setTag('http.method', c.req.method)
    Sentry.getCurrentScope().setTag('http.path', c.req.path)
    await next()
  })
}
