import { Hono } from 'hono'
import type { MiddlewareHandler } from 'hono'
import logger from '@utils/logger'

export const loggerMiddleware: MiddlewareHandler = async (c, next) => {
  const start = Date.now()
  const method = c.req.method
  const url = c.req.url

  await next()

  const status = c.res.status
  const duration = Date.now() - start

  logger.info({
    method,
    url,
    status,
    duration,
    timestamp: new Date().toISOString(),
  })
}

export function applyLogger(app: Hono) {
  app.use('*', loggerMiddleware)
}
