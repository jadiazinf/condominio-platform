/**
 * Payment Concepts Endpoints Types
 *
 * Type definitions for payment concept API endpoints.
 */

import type {
  TPaymentConcept,
  TPaymentConceptCreate,
  TPaymentConceptUpdate,
} from '@packages/domain'
import type { TEndpointDefinition, TIdParam } from './base'
import type { TApiDataResponse } from '../api-responses'

// =============================================================================
// Payment Concepts Endpoints
// =============================================================================

type TCondominiumIdParam = { condominiumId: string }
type TBuildingIdParam = { buildingId: string }
type TConceptTypeParam = { conceptType: string }

/** GET /payment-concepts - List all */
export type TPaymentConceptsListEndpoint = TEndpointDefinition<
  'GET',
  '/payment-concepts',
  TApiDataResponse<TPaymentConcept[]>
>

/** GET /payment-concepts/recurring - Get recurring concepts */
export type TPaymentConceptsGetRecurringEndpoint = TEndpointDefinition<
  'GET',
  '/payment-concepts/recurring',
  TApiDataResponse<TPaymentConcept[]>
>

/** GET /payment-concepts/condominium/:condominiumId - Get by condominium */
export type TPaymentConceptsGetByCondominiumEndpoint = TEndpointDefinition<
  'GET',
  '/payment-concepts/condominium/:condominiumId',
  TApiDataResponse<TPaymentConcept[]>,
  void,
  TCondominiumIdParam
>

/** GET /payment-concepts/building/:buildingId - Get by building */
export type TPaymentConceptsGetByBuildingEndpoint = TEndpointDefinition<
  'GET',
  '/payment-concepts/building/:buildingId',
  TApiDataResponse<TPaymentConcept[]>,
  void,
  TBuildingIdParam
>

/** GET /payment-concepts/type/:conceptType - Get by concept type */
export type TPaymentConceptsGetByTypeEndpoint = TEndpointDefinition<
  'GET',
  '/payment-concepts/type/:conceptType',
  TApiDataResponse<TPaymentConcept[]>,
  void,
  TConceptTypeParam
>

/** GET /payment-concepts/:id - Get by ID */
export type TPaymentConceptsGetByIdEndpoint = TEndpointDefinition<
  'GET',
  '/payment-concepts/:id',
  TApiDataResponse<TPaymentConcept>,
  void,
  TIdParam
>

/** POST /payment-concepts - Create */
export type TPaymentConceptsCreateEndpoint = TEndpointDefinition<
  'POST',
  '/payment-concepts',
  TApiDataResponse<TPaymentConcept>,
  TPaymentConceptCreate
>

/** PATCH /payment-concepts/:id - Update */
export type TPaymentConceptsUpdateEndpoint = TEndpointDefinition<
  'PATCH',
  '/payment-concepts/:id',
  TApiDataResponse<TPaymentConcept>,
  TPaymentConceptUpdate,
  TIdParam
>

/** DELETE /payment-concepts/:id - Delete */
export type TPaymentConceptsDeleteEndpoint = TEndpointDefinition<
  'DELETE',
  '/payment-concepts/:id',
  void,
  void,
  TIdParam
>

export type TPaymentConceptsEndpoints = {
  list: TPaymentConceptsListEndpoint
  getRecurring: TPaymentConceptsGetRecurringEndpoint
  getByCondominium: TPaymentConceptsGetByCondominiumEndpoint
  getByBuilding: TPaymentConceptsGetByBuildingEndpoint
  getByType: TPaymentConceptsGetByTypeEndpoint
  getById: TPaymentConceptsGetByIdEndpoint
  create: TPaymentConceptsCreateEndpoint
  update: TPaymentConceptsUpdateEndpoint
  delete: TPaymentConceptsDeleteEndpoint
}
