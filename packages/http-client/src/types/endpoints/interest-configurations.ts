/**
 * Interest Configurations Endpoints Types
 *
 * Type definitions for interest configuration API endpoints.
 */

import type {
  TInterestConfiguration,
  TInterestConfigurationCreate,
  TInterestConfigurationUpdate,
} from '@packages/domain'
import type { TEndpointDefinition, TIdParam } from './base'
import type { TApiDataResponse } from '../api-responses'

// =============================================================================
// Interest Configurations Endpoints
// =============================================================================

type TCondominiumIdParam = { condominiumId: string }
type TPaymentConceptIdParam = { paymentConceptId: string }
type TActiveForDateParam = { paymentConceptId: string; date: string }

/** GET /interest-configurations - List all */
export type TInterestConfigurationsListEndpoint = TEndpointDefinition<
  'GET',
  '/interest-configurations',
  TApiDataResponse<TInterestConfiguration[]>
>

/** GET /interest-configurations/condominium/:condominiumId - Get by condominium */
export type TInterestConfigurationsGetByCondominiumEndpoint = TEndpointDefinition<
  'GET',
  '/interest-configurations/condominium/:condominiumId',
  TApiDataResponse<TInterestConfiguration[]>,
  void,
  TCondominiumIdParam
>

/** GET /interest-configurations/payment-concept/:paymentConceptId - Get by payment concept */
export type TInterestConfigurationsGetByPaymentConceptEndpoint = TEndpointDefinition<
  'GET',
  '/interest-configurations/payment-concept/:paymentConceptId',
  TApiDataResponse<TInterestConfiguration[]>,
  void,
  TPaymentConceptIdParam
>

/** GET /interest-configurations/payment-concept/:paymentConceptId/active/:date - Get active for date */
export type TInterestConfigurationsGetActiveForDateEndpoint = TEndpointDefinition<
  'GET',
  '/interest-configurations/payment-concept/:paymentConceptId/active/:date',
  TApiDataResponse<TInterestConfiguration>,
  void,
  TActiveForDateParam
>

/** GET /interest-configurations/:id - Get by ID */
export type TInterestConfigurationsGetByIdEndpoint = TEndpointDefinition<
  'GET',
  '/interest-configurations/:id',
  TApiDataResponse<TInterestConfiguration>,
  void,
  TIdParam
>

/** POST /interest-configurations - Create */
export type TInterestConfigurationsCreateEndpoint = TEndpointDefinition<
  'POST',
  '/interest-configurations',
  TApiDataResponse<TInterestConfiguration>,
  TInterestConfigurationCreate
>

/** PATCH /interest-configurations/:id - Update */
export type TInterestConfigurationsUpdateEndpoint = TEndpointDefinition<
  'PATCH',
  '/interest-configurations/:id',
  TApiDataResponse<TInterestConfiguration>,
  TInterestConfigurationUpdate,
  TIdParam
>

/** DELETE /interest-configurations/:id - Delete */
export type TInterestConfigurationsDeleteEndpoint = TEndpointDefinition<
  'DELETE',
  '/interest-configurations/:id',
  void,
  void,
  TIdParam
>

export type TInterestConfigurationsEndpoints = {
  list: TInterestConfigurationsListEndpoint
  getByCondominium: TInterestConfigurationsGetByCondominiumEndpoint
  getByPaymentConcept: TInterestConfigurationsGetByPaymentConceptEndpoint
  getActiveForDate: TInterestConfigurationsGetActiveForDateEndpoint
  getById: TInterestConfigurationsGetByIdEndpoint
  create: TInterestConfigurationsCreateEndpoint
  update: TInterestConfigurationsUpdateEndpoint
  delete: TInterestConfigurationsDeleteEndpoint
}
