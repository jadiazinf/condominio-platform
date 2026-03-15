import type { Hono } from 'hono'

/**
 * Definition for an API endpoint.
 */
export type TApiEndpointDefinition = {
  path: string
  router: Hono
}

