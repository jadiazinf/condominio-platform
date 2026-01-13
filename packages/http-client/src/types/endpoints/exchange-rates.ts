/**
 * Exchange Rates Endpoints Types
 *
 * Type definitions for exchange rate API endpoints.
 */

import type { TExchangeRate, TExchangeRateCreate, TExchangeRateUpdate } from '@packages/domain'
import type { TEndpointDefinition, TIdParam } from './base'
import type { TApiDataResponse } from '../api-responses'

// =============================================================================
// Exchange Rates Endpoints
// =============================================================================

type TDateParam = { date: string }
type TCurrencyPairParam = { fromCurrencyId: string; toCurrencyId: string }

/** GET /exchange-rates - List all */
export type TExchangeRatesListEndpoint = TEndpointDefinition<
  'GET',
  '/exchange-rates',
  TApiDataResponse<TExchangeRate[]>
>

/** GET /exchange-rates/date/:date - Get by date */
export type TExchangeRatesGetByDateEndpoint = TEndpointDefinition<
  'GET',
  '/exchange-rates/date/:date',
  TApiDataResponse<TExchangeRate[]>,
  void,
  TDateParam
>

/** GET /exchange-rates/latest/:fromCurrencyId/:toCurrencyId - Get latest rate */
export type TExchangeRatesGetLatestEndpoint = TEndpointDefinition<
  'GET',
  '/exchange-rates/latest/:fromCurrencyId/:toCurrencyId',
  TApiDataResponse<TExchangeRate>,
  void,
  TCurrencyPairParam
>

/** GET /exchange-rates/:id - Get by ID */
export type TExchangeRatesGetByIdEndpoint = TEndpointDefinition<
  'GET',
  '/exchange-rates/:id',
  TApiDataResponse<TExchangeRate>,
  void,
  TIdParam
>

/** POST /exchange-rates - Create */
export type TExchangeRatesCreateEndpoint = TEndpointDefinition<
  'POST',
  '/exchange-rates',
  TApiDataResponse<TExchangeRate>,
  TExchangeRateCreate
>

/** PATCH /exchange-rates/:id - Update */
export type TExchangeRatesUpdateEndpoint = TEndpointDefinition<
  'PATCH',
  '/exchange-rates/:id',
  TApiDataResponse<TExchangeRate>,
  TExchangeRateUpdate,
  TIdParam
>

/** DELETE /exchange-rates/:id - Delete */
export type TExchangeRatesDeleteEndpoint = TEndpointDefinition<
  'DELETE',
  '/exchange-rates/:id',
  void,
  void,
  TIdParam
>

export type TExchangeRatesEndpoints = {
  list: TExchangeRatesListEndpoint
  getByDate: TExchangeRatesGetByDateEndpoint
  getLatest: TExchangeRatesGetLatestEndpoint
  getById: TExchangeRatesGetByIdEndpoint
  create: TExchangeRatesCreateEndpoint
  update: TExchangeRatesUpdateEndpoint
  delete: TExchangeRatesDeleteEndpoint
}
