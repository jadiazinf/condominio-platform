/**
 * Base Endpoint Types
 *
 * These types define the structure of API endpoints for type-safe
 * client-server communication.
 */

import type {
  TApiDataResponse,
  TApiDataMessageResponse,
  TApiMessageResponse,
} from '../api-responses'

// HTTP Methods
export type THttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

/**
 * Base endpoint definition type.
 * Use this to define the contract between client and server.
 */
export type TEndpointDefinition<
  TMethod extends THttpMethod = THttpMethod,
  TPath extends string = string,
  TResponse = unknown,
  TBody = void,
  TParams = void,
  TQuery = void,
> = {
  method: TMethod
  path: TPath
  response: TResponse
  body: TBody
  params: TParams
  query: TQuery
}

/**
 * Helper type to extract endpoint parts
 */
export type TExtractResponse<T> =
  T extends TEndpointDefinition<infer _M, infer _P, infer R, infer _B, infer _Pa, infer _Q>
    ? R
    : never

export type TExtractBody<T> =
  T extends TEndpointDefinition<infer _M, infer _P, infer _R, infer B, infer _Pa, infer _Q>
    ? B
    : never

export type TExtractParams<T> =
  T extends TEndpointDefinition<infer _M, infer _P, infer _R, infer _B, infer Pa, infer _Q>
    ? Pa
    : never

export type TExtractQuery<T> =
  T extends TEndpointDefinition<infer _M, infer _P, infer _R, infer _B, infer _Pa, infer Q>
    ? Q
    : never

// Common parameter types
export type TIdParam = { id: string }
export type TCodeParam = { code: string }
export type TEmailParam = { email: string }
export type TNameParam = { name: string }

// Common response types (re-export for convenience)
export type { TApiDataResponse, TApiDataMessageResponse, TApiMessageResponse }
