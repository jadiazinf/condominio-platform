import type { Hono } from 'hono'

/**
 * Definition for an API endpoint.
 */
export type TApiEndpointDefinition = {
  path: string
  router: Hono
}

/**
 * Interface for endpoint classes.
 * Each endpoint class manages a specific resource.
 */
export interface IEndpoint {
  /**
   * The base path for this endpoint (e.g., '/currencies').
   */
  readonly path: string

  /**
   * Returns the Hono router for this endpoint.
   */
  getRouter(): Hono
}
