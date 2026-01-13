/**
 * Payment Applications Endpoints Types
 *
 * Type definitions for payment application API endpoints.
 */

import type {
  TPaymentApplication,
  TPaymentApplicationCreate,
  TPaymentApplicationUpdate,
} from '@packages/domain'
import type { TEndpointDefinition, TIdParam } from './base'
import type { TApiDataResponse } from '../api-responses'

// =============================================================================
// Payment Applications Endpoints
// =============================================================================

type TPaymentIdParam = { paymentId: string }
type TQuotaIdParam = { quotaId: string }

/** GET /payment-applications - List all */
export type TPaymentApplicationsListEndpoint = TEndpointDefinition<
  'GET',
  '/payment-applications',
  TApiDataResponse<TPaymentApplication[]>
>

/** GET /payment-applications/payment/:paymentId - Get by payment */
export type TPaymentApplicationsGetByPaymentEndpoint = TEndpointDefinition<
  'GET',
  '/payment-applications/payment/:paymentId',
  TApiDataResponse<TPaymentApplication[]>,
  void,
  TPaymentIdParam
>

/** GET /payment-applications/quota/:quotaId - Get by quota */
export type TPaymentApplicationsGetByQuotaEndpoint = TEndpointDefinition<
  'GET',
  '/payment-applications/quota/:quotaId',
  TApiDataResponse<TPaymentApplication[]>,
  void,
  TQuotaIdParam
>

/** GET /payment-applications/:id - Get by ID */
export type TPaymentApplicationsGetByIdEndpoint = TEndpointDefinition<
  'GET',
  '/payment-applications/:id',
  TApiDataResponse<TPaymentApplication>,
  void,
  TIdParam
>

/** POST /payment-applications - Create */
export type TPaymentApplicationsCreateEndpoint = TEndpointDefinition<
  'POST',
  '/payment-applications',
  TApiDataResponse<TPaymentApplication>,
  TPaymentApplicationCreate
>

/** PATCH /payment-applications/:id - Update */
export type TPaymentApplicationsUpdateEndpoint = TEndpointDefinition<
  'PATCH',
  '/payment-applications/:id',
  TApiDataResponse<TPaymentApplication>,
  TPaymentApplicationUpdate,
  TIdParam
>

/** DELETE /payment-applications/:id - Delete */
export type TPaymentApplicationsDeleteEndpoint = TEndpointDefinition<
  'DELETE',
  '/payment-applications/:id',
  void,
  void,
  TIdParam
>

export type TPaymentApplicationsEndpoints = {
  list: TPaymentApplicationsListEndpoint
  getByPayment: TPaymentApplicationsGetByPaymentEndpoint
  getByQuota: TPaymentApplicationsGetByQuotaEndpoint
  getById: TPaymentApplicationsGetByIdEndpoint
  create: TPaymentApplicationsCreateEndpoint
  update: TPaymentApplicationsUpdateEndpoint
  delete: TPaymentApplicationsDeleteEndpoint
}
