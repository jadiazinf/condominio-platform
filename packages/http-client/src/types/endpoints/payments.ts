/**
 * Payments Endpoints Types
 *
 * Type definitions for core payment API endpoints.
 */

import type { TPayment, TPaymentCreate, TPaymentUpdate, TPaymentStatus } from '@packages/domain'
import type { TEndpointDefinition, TIdParam } from './base'
import type { TApiDataResponse, TApiDataMessageResponse } from '../api-responses'

// =============================================================================
// Payments Endpoints
// =============================================================================

type TPaymentNumberParam = { paymentNumber: string }
type TUserIdParam = { userId: string }
type TUnitIdParam = { unitId: string }
type TPaymentStatusParam = { status: TPaymentStatus }
type TDateRangeQuery = { startDate: string; endDate: string }
type TVerificationBody = { notes?: string }

/** GET /payments - List all */
export type TPaymentsListEndpoint = TEndpointDefinition<
  'GET',
  '/payments',
  TApiDataResponse<TPayment[]>
>

/** GET /payments/pending-verification - Get pending verification */
export type TPaymentsGetPendingVerificationEndpoint = TEndpointDefinition<
  'GET',
  '/payments/pending-verification',
  TApiDataResponse<TPayment[]>
>

/** GET /payments/number/:paymentNumber - Get by payment number */
export type TPaymentsGetByNumberEndpoint = TEndpointDefinition<
  'GET',
  '/payments/number/:paymentNumber',
  TApiDataResponse<TPayment>,
  void,
  TPaymentNumberParam
>

/** GET /payments/user/:userId - Get by user */
export type TPaymentsGetByUserEndpoint = TEndpointDefinition<
  'GET',
  '/payments/user/:userId',
  TApiDataResponse<TPayment[]>,
  void,
  TUserIdParam
>

/** GET /payments/unit/:unitId - Get by unit */
export type TPaymentsGetByUnitEndpoint = TEndpointDefinition<
  'GET',
  '/payments/unit/:unitId',
  TApiDataResponse<TPayment[]>,
  void,
  TUnitIdParam
>

/** GET /payments/status/:status - Get by status */
export type TPaymentsGetByStatusEndpoint = TEndpointDefinition<
  'GET',
  '/payments/status/:status',
  TApiDataResponse<TPayment[]>,
  void,
  TPaymentStatusParam
>

/** GET /payments/date-range - Get by date range */
export type TPaymentsGetByDateRangeEndpoint = TEndpointDefinition<
  'GET',
  '/payments/date-range',
  TApiDataResponse<TPayment[]>,
  void,
  void,
  TDateRangeQuery
>

/** GET /payments/:id - Get by ID */
export type TPaymentsGetByIdEndpoint = TEndpointDefinition<
  'GET',
  '/payments/:id',
  TApiDataResponse<TPayment>,
  void,
  TIdParam
>

/** POST /payments - Create */
export type TPaymentsCreateEndpoint = TEndpointDefinition<
  'POST',
  '/payments',
  TApiDataResponse<TPayment>,
  TPaymentCreate
>

/** POST /payments/report - Report payment */
export type TPaymentsReportEndpoint = TEndpointDefinition<
  'POST',
  '/payments/report',
  TApiDataResponse<TPayment>,
  TPaymentCreate
>

/** POST /payments/:id/verify - Verify payment */
export type TPaymentsVerifyEndpoint = TEndpointDefinition<
  'POST',
  '/payments/:id/verify',
  TApiDataMessageResponse<TPayment>,
  TVerificationBody,
  TIdParam
>

/** POST /payments/:id/reject - Reject payment */
export type TPaymentsRejectEndpoint = TEndpointDefinition<
  'POST',
  '/payments/:id/reject',
  TApiDataMessageResponse<TPayment>,
  TVerificationBody,
  TIdParam
>

/** PATCH /payments/:id - Update */
export type TPaymentsUpdateEndpoint = TEndpointDefinition<
  'PATCH',
  '/payments/:id',
  TApiDataResponse<TPayment>,
  TPaymentUpdate,
  TIdParam
>

/** DELETE /payments/:id - Delete */
export type TPaymentsDeleteEndpoint = TEndpointDefinition<
  'DELETE',
  '/payments/:id',
  void,
  void,
  TIdParam
>

export type TPaymentsEndpoints = {
  list: TPaymentsListEndpoint
  getPendingVerification: TPaymentsGetPendingVerificationEndpoint
  getByNumber: TPaymentsGetByNumberEndpoint
  getByUser: TPaymentsGetByUserEndpoint
  getByUnit: TPaymentsGetByUnitEndpoint
  getByStatus: TPaymentsGetByStatusEndpoint
  getByDateRange: TPaymentsGetByDateRangeEndpoint
  getById: TPaymentsGetByIdEndpoint
  create: TPaymentsCreateEndpoint
  report: TPaymentsReportEndpoint
  verify: TPaymentsVerifyEndpoint
  reject: TPaymentsRejectEndpoint
  update: TPaymentsUpdateEndpoint
  delete: TPaymentsDeleteEndpoint
}
