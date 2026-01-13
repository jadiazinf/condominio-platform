import { Hono } from 'hono'
import type { IEndpoint } from './types'

export class HealthEndpoint implements IEndpoint {
  readonly path = '/health'

  getRouter(): Hono {
    const router = new Hono()

    router.get('/', (c) => {
      return c.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
      })
    })

    return router
  }
}
