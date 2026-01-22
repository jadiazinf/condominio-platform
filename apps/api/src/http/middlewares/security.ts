import { Hono } from 'hono'
import { bodyLimit } from 'hono/body-limit'
import { cors } from 'hono/cors'
import type { MiddlewareHandler } from 'hono'
import { env } from '@config/environment'

const securityHeaders: MiddlewareHandler = async (c, next) => {
  c.header('X-Content-Type-Options', 'nosniff')
  c.header('X-Frame-Options', 'DENY')
  c.header('X-XSS-Protection', '1; mode=block')
  c.header('Referrer-Policy', 'no-referrer')
  c.header('Content-Security-Policy', "default-src 'self'")
  await next()
}

export function applyBodyLimit(app: Hono) {
  app.use('*', bodyLimit({ maxSize: 1_000_000 }))
}

export function applyCors(app: Hono) {
  app.use(
    '*',
    cors({
      origin: env.CORS_ORIGIN ?? '*',
      allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    })
  )
}

export function applySecurityHeaders(app: Hono) {
  app.use('*', securityHeaders)
}

export function applyRateLimiting(app: Hono) {
  const rateLimitStore = new Map<string, { count: number; reset: number }>()

  const rateLimit: MiddlewareHandler = async (c, next) => {
    const ip =
      c.req.header('X-Forwarded-For') ??
      c.req.header('CF-Connecting-IP') ??
      c.req.header('X-Real-IP') ??
      'unknown'
    const now = Date.now()
    const windowMs = 60_000
    const maxRequests = 60

    const entry = rateLimitStore.get(ip) ?? { count: 0, reset: now + windowMs }

    if (now > entry.reset) {
      entry.count = 0
      entry.reset = now + windowMs
    }

    entry.count += 1
    rateLimitStore.set(ip, entry)

    if (entry.count > maxRequests) {
      return c.text('Too many requests', 429)
    }

    await next()
  }

  app.use('*', rateLimit)
}
