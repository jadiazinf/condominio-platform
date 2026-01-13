/**
 * Payment Gateways Endpoints Types
 *
 * Type definitions for payment gateway-related API endpoints:
 * - Payment Gateways
 * - Entity Payment Gateways
 */

import type {
  TPaymentGateway,
  TPaymentGatewayCreate,
  TPaymentGatewayUpdate,
  TEntityPaymentGateway,
  TEntityPaymentGatewayCreate,
  TEntityPaymentGatewayUpdate,
} from '@packages/domain'
import type { TEndpointDefinition, TIdParam } from './base'
import type { TApiDataResponse } from '../api-responses'

// =============================================================================
// Payment Gateways Endpoints
// =============================================================================

type TNameParam = { name: string }
type TGatewayTypeParam = { gatewayType: string }

/** GET /payment-gateways - List all */
export type TPaymentGatewaysListEndpoint = TEndpointDefinition<
  'GET',
  '/payment-gateways',
  TApiDataResponse<TPaymentGateway[]>
>

/** GET /payment-gateways/production - Get production gateways */
export type TPaymentGatewaysGetProductionEndpoint = TEndpointDefinition<
  'GET',
  '/payment-gateways/production',
  TApiDataResponse<TPaymentGateway[]>
>

/** GET /payment-gateways/name/:name - Get by name */
export type TPaymentGatewaysGetByNameEndpoint = TEndpointDefinition<
  'GET',
  '/payment-gateways/name/:name',
  TApiDataResponse<TPaymentGateway>,
  void,
  TNameParam
>

/** GET /payment-gateways/type/:gatewayType - Get by type */
export type TPaymentGatewaysGetByTypeEndpoint = TEndpointDefinition<
  'GET',
  '/payment-gateways/type/:gatewayType',
  TApiDataResponse<TPaymentGateway[]>,
  void,
  TGatewayTypeParam
>

/** GET /payment-gateways/:id - Get by ID */
export type TPaymentGatewaysGetByIdEndpoint = TEndpointDefinition<
  'GET',
  '/payment-gateways/:id',
  TApiDataResponse<TPaymentGateway>,
  void,
  TIdParam
>

/** POST /payment-gateways - Create */
export type TPaymentGatewaysCreateEndpoint = TEndpointDefinition<
  'POST',
  '/payment-gateways',
  TApiDataResponse<TPaymentGateway>,
  TPaymentGatewayCreate
>

/** PATCH /payment-gateways/:id - Update */
export type TPaymentGatewaysUpdateEndpoint = TEndpointDefinition<
  'PATCH',
  '/payment-gateways/:id',
  TApiDataResponse<TPaymentGateway>,
  TPaymentGatewayUpdate,
  TIdParam
>

/** DELETE /payment-gateways/:id - Delete */
export type TPaymentGatewaysDeleteEndpoint = TEndpointDefinition<
  'DELETE',
  '/payment-gateways/:id',
  void,
  void,
  TIdParam
>

export type TPaymentGatewaysEndpoints = {
  list: TPaymentGatewaysListEndpoint
  getProduction: TPaymentGatewaysGetProductionEndpoint
  getByName: TPaymentGatewaysGetByNameEndpoint
  getByType: TPaymentGatewaysGetByTypeEndpoint
  getById: TPaymentGatewaysGetByIdEndpoint
  create: TPaymentGatewaysCreateEndpoint
  update: TPaymentGatewaysUpdateEndpoint
  delete: TPaymentGatewaysDeleteEndpoint
}

// =============================================================================
// Entity Payment Gateways Endpoints
// =============================================================================

type TCondominiumIdParam = { condominiumId: string }
type TBuildingIdParam = { buildingId: string }
type TPaymentGatewayIdParam = { paymentGatewayId: string }

/** GET /entity-payment-gateways - List all */
export type TEntityPaymentGatewaysListEndpoint = TEndpointDefinition<
  'GET',
  '/entity-payment-gateways',
  TApiDataResponse<TEntityPaymentGateway[]>
>

/** GET /entity-payment-gateways/condominium/:condominiumId - Get by condominium */
export type TEntityPaymentGatewaysGetByCondominiumEndpoint = TEndpointDefinition<
  'GET',
  '/entity-payment-gateways/condominium/:condominiumId',
  TApiDataResponse<TEntityPaymentGateway[]>,
  void,
  TCondominiumIdParam
>

/** GET /entity-payment-gateways/building/:buildingId - Get by building */
export type TEntityPaymentGatewaysGetByBuildingEndpoint = TEndpointDefinition<
  'GET',
  '/entity-payment-gateways/building/:buildingId',
  TApiDataResponse<TEntityPaymentGateway[]>,
  void,
  TBuildingIdParam
>

/** GET /entity-payment-gateways/gateway/:paymentGatewayId - Get by payment gateway */
export type TEntityPaymentGatewaysGetByGatewayEndpoint = TEndpointDefinition<
  'GET',
  '/entity-payment-gateways/gateway/:paymentGatewayId',
  TApiDataResponse<TEntityPaymentGateway[]>,
  void,
  TPaymentGatewayIdParam
>

/** GET /entity-payment-gateways/:id - Get by ID */
export type TEntityPaymentGatewaysGetByIdEndpoint = TEndpointDefinition<
  'GET',
  '/entity-payment-gateways/:id',
  TApiDataResponse<TEntityPaymentGateway>,
  void,
  TIdParam
>

/** POST /entity-payment-gateways - Create */
export type TEntityPaymentGatewaysCreateEndpoint = TEndpointDefinition<
  'POST',
  '/entity-payment-gateways',
  TApiDataResponse<TEntityPaymentGateway>,
  TEntityPaymentGatewayCreate
>

/** PATCH /entity-payment-gateways/:id - Update */
export type TEntityPaymentGatewaysUpdateEndpoint = TEndpointDefinition<
  'PATCH',
  '/entity-payment-gateways/:id',
  TApiDataResponse<TEntityPaymentGateway>,
  TEntityPaymentGatewayUpdate,
  TIdParam
>

/** DELETE /entity-payment-gateways/:id - Delete */
export type TEntityPaymentGatewaysDeleteEndpoint = TEndpointDefinition<
  'DELETE',
  '/entity-payment-gateways/:id',
  void,
  void,
  TIdParam
>

export type TEntityPaymentGatewaysEndpoints = {
  list: TEntityPaymentGatewaysListEndpoint
  getByCondominium: TEntityPaymentGatewaysGetByCondominiumEndpoint
  getByBuilding: TEntityPaymentGatewaysGetByBuildingEndpoint
  getByGateway: TEntityPaymentGatewaysGetByGatewayEndpoint
  getById: TEntityPaymentGatewaysGetByIdEndpoint
  create: TEntityPaymentGatewaysCreateEndpoint
  update: TEntityPaymentGatewaysUpdateEndpoint
  delete: TEntityPaymentGatewaysDeleteEndpoint
}
