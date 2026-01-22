import { Hono } from 'hono'
import { applyLogger } from './middlewares/logger'
import { applyErrorHandler } from './middlewares/error-handler'
import { ApiRoutes } from './endpoints'
import {
  applyBodyLimit,
  applyCors,
  applyRateLimiting,
  applySecurityHeaders,
} from './middlewares/security'
import { applyI18nMiddleware } from './middlewares/locales'
import '@libs/firebase/config'

export class Server {
  private static instance: Server
  private app: Hono | null = null
  private built = false

  private constructor() {}

  public static getInstance(): Server {
    if (!Server.instance) {
      Server.instance = new Server()
    }
    return Server.instance
  }

  public getApp(): Hono {
    if (!this.built) {
      this.app = this.buildApp()
    }
    return this.app!
  }

  public buildApp(): Hono {
    const app = new Hono()
    this.setupMiddlewares(app)
    this.setupRoutes(app)
    this.built = true
    return app
  }

  private setupMiddlewares(app: Hono) {
    // Error handler must be first to catch all errors from subsequent middlewares
    applyErrorHandler(app)
    applySecurityHeaders(app)
    applyCors(app)
    applyBodyLimit(app)
    applyRateLimiting(app)
    applyLogger(app)
    applyI18nMiddleware(app)
  }

  private setupRoutes(app: Hono) {
    for (const { path, router } of new ApiRoutes().getRoutes()) {
      app.route(`/api${path}`, router)
    }
  }
}
