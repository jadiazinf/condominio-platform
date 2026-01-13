/**
 * Currencies Endpoints Types
 *
 * Type definitions for all currency-related API endpoints.
 */

import type { TCurrency, TCurrencyCreate, TCurrencyUpdate } from '@packages/domain'
import type { TEndpointDefinition, TIdParam, TCodeParam } from './base'
import type { TApiDataResponse } from '../api-responses'

// ─────────────────────────────────────────────────────────────────────────────
// Currencies Endpoints
// ─────────────────────────────────────────────────────────────────────────────

/** GET /currencies - List all currencies */
export type TCurrenciesListEndpoint = TEndpointDefinition<
  'GET',
  '/currencies',
  TApiDataResponse<TCurrency[]>
>

/** GET /currencies/base - Get base currency */
export type TCurrenciesGetBaseEndpoint = TEndpointDefinition<
  'GET',
  '/currencies/base',
  TApiDataResponse<TCurrency>
>

/** GET /currencies/code/:code - Get currency by code */
export type TCurrenciesGetByCodeEndpoint = TEndpointDefinition<
  'GET',
  '/currencies/code/:code',
  TApiDataResponse<TCurrency>,
  void,
  TCodeParam
>

/** GET /currencies/:id - Get currency by ID */
export type TCurrenciesGetByIdEndpoint = TEndpointDefinition<
  'GET',
  '/currencies/:id',
  TApiDataResponse<TCurrency>,
  void,
  TIdParam
>

/** POST /currencies - Create currency */
export type TCurrenciesCreateEndpoint = TEndpointDefinition<
  'POST',
  '/currencies',
  TApiDataResponse<TCurrency>,
  TCurrencyCreate
>

/** PATCH /currencies/:id - Update currency */
export type TCurrenciesUpdateEndpoint = TEndpointDefinition<
  'PATCH',
  '/currencies/:id',
  TApiDataResponse<TCurrency>,
  TCurrencyUpdate,
  TIdParam
>

/** DELETE /currencies/:id - Delete currency */
export type TCurrenciesDeleteEndpoint = TEndpointDefinition<
  'DELETE',
  '/currencies/:id',
  void,
  void,
  TIdParam
>

// ─────────────────────────────────────────────────────────────────────────────
// Aggregated Currencies API Types
// ─────────────────────────────────────────────────────────────────────────────

export type TCurrenciesEndpoints = {
  list: TCurrenciesListEndpoint
  getBase: TCurrenciesGetBaseEndpoint
  getByCode: TCurrenciesGetByCodeEndpoint
  getById: TCurrenciesGetByIdEndpoint
  create: TCurrenciesCreateEndpoint
  update: TCurrenciesUpdateEndpoint
  delete: TCurrenciesDeleteEndpoint
}
