import { Hono } from 'hono'
import type { TRouteDefinition } from './types'

/**
 * Registers a route with its middlewares and handler.
 * Uses explicit middleware chaining to work with Hono's strict typings.
 */
function registerRoute(router: Hono, route: TRouteDefinition): void {
  const { method, path, handler, middlewares = [] } = route

  // If no middlewares, register handler directly
  if (middlewares.length === 0) {
    switch (method) {
      case 'get':
        router.get(path, handler)
        break
      case 'post':
        router.post(path, handler)
        break
      case 'patch':
        router.patch(path, handler)
        break
      case 'put':
        router.put(path, handler)
        break
      case 'delete':
        router.delete(path, handler)
        break
    }
    return
  }

  // With 1 middleware
  if (middlewares.length === 1) {
    const m1 = middlewares[0]!
    switch (method) {
      case 'get':
        router.get(path, m1, handler)
        break
      case 'post':
        router.post(path, m1, handler)
        break
      case 'patch':
        router.patch(path, m1, handler)
        break
      case 'put':
        router.put(path, m1, handler)
        break
      case 'delete':
        router.delete(path, m1, handler)
        break
    }
    return
  }

  // With 2 middlewares (common case for params + body validation)
  if (middlewares.length === 2) {
    const m1 = middlewares[0]!
    const m2 = middlewares[1]!
    switch (method) {
      case 'get':
        router.get(path, m1, m2, handler)
        break
      case 'post':
        router.post(path, m1, m2, handler)
        break
      case 'patch':
        router.patch(path, m1, m2, handler)
        break
      case 'put':
        router.put(path, m1, m2, handler)
        break
      case 'delete':
        router.delete(path, m1, m2, handler)
        break
    }
    return
  }

  // With 3 middlewares
  if (middlewares.length === 3) {
    const m1 = middlewares[0]!
    const m2 = middlewares[1]!
    const m3 = middlewares[2]!
    switch (method) {
      case 'get':
        router.get(path, m1, m2, m3, handler)
        break
      case 'post':
        router.post(path, m1, m2, m3, handler)
        break
      case 'patch':
        router.patch(path, m1, m2, m3, handler)
        break
      case 'put':
        router.put(path, m1, m2, m3, handler)
        break
      case 'delete':
        router.delete(path, m1, m2, m3, handler)
        break
    }
    return
  }

  // With 4+ middlewares (fallback for complex routes)
  const m1 = middlewares[0]!
  const m2 = middlewares[1]!
  const m3 = middlewares[2]!
  const m4 = middlewares[3]!
  const remaining = middlewares.slice(4)
  switch (method) {
    case 'get':
      router.get(path, m1, m2, m3, m4, ...remaining, handler)
      break
    case 'post':
      router.post(path, m1, m2, m3, m4, ...remaining, handler)
      break
    case 'patch':
      router.patch(path, m1, m2, m3, m4, ...remaining, handler)
      break
    case 'put':
      router.put(path, m1, m2, m3, m4, ...remaining, handler)
      break
    case 'delete':
      router.delete(path, m1, m2, m3, m4, ...remaining, handler)
      break
  }
}

/**
 * Creates a Hono router from an array of route definitions.
 * This provides a declarative way to define routes.
 *
 * @example
 * const routes: TRouteDefinition[] = [
 *   { method: 'get', path: '/', handler: controller.list },
 *   { method: 'get', path: '/:id', handler: controller.getById, middlewares: [paramsValidator(schema)] },
 * ]
 * const router = createRouter(routes)
 */
export function createRouter(routes: TRouteDefinition[]): Hono {
  const router = new Hono()

  for (const route of routes) {
    registerRoute(router, route)
  }

  return router
}
