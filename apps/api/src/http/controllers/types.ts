import type { Context, MiddlewareHandler, Handler } from 'hono'
import type { z } from 'zod'

/**
 * HTTP methods supported by the router.
 */
export type THttpMethod = 'get' | 'post' | 'patch' | 'put' | 'delete'

/**
 * Handler function that processes a request and returns a response.
 * Uses Hono's Handler type for full compatibility with the router.
 */
export type TRouteHandler = Handler

/**
 * Definition of a single route.
 */
export type TRouteDefinition = {
  method: THttpMethod
  path: string
  handler: TRouteHandler
  middlewares?: MiddlewareHandler[]
}

/**
 * Validation schemas for a route.
 */
export type TValidationSchemas = {
  body?: z.ZodTypeAny
  params?: z.ZodTypeAny
  query?: z.ZodTypeAny
}
