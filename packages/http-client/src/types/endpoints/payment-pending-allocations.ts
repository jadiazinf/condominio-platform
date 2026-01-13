/**
 * Payment Pending Allocations Endpoints Types
 *
 * Type definitions for payment pending allocation API endpoints.
 */

import type { TPaymentPendingAllocation } from '@packages/domain'
import { EAllocationStatuses } from '@packages/domain'
import type { TEndpointDefinition, TIdParam } from './base'
import type { TApiDataResponse, TApiDataMessageResponse } from '../api-responses'

// =============================================================================
// Payment Pending Allocations Endpoints
// =============================================================================

// Allocation status type
type TAllocationStatus = (typeof EAllocationStatuses)[number]

type TPaymentIdParam = { paymentId: string }
type TStatusQuery = { status?: TAllocationStatus }

// Allocate to quota body
type TAllocateToQuotaBody = {
  quotaId: string
  resolutionNotes?: string | null
}

// Refund body
type TRefundBody = {
  resolutionNotes: string
}

/** GET /payment-pending-allocations - List all pending */
export type TPaymentPendingAllocationsListEndpoint = TEndpointDefinition<
  'GET',
  '/payment-pending-allocations',
  TApiDataResponse<TPaymentPendingAllocation[]>,
  void,
  void,
  TStatusQuery
>

/** GET /payment-pending-allocations/payment/:paymentId - Get by payment */
export type TPaymentPendingAllocationsGetByPaymentEndpoint = TEndpointDefinition<
  'GET',
  '/payment-pending-allocations/payment/:paymentId',
  TApiDataResponse<TPaymentPendingAllocation[]>,
  void,
  TPaymentIdParam
>

/** GET /payment-pending-allocations/:id - Get by ID */
export type TPaymentPendingAllocationsGetByIdEndpoint = TEndpointDefinition<
  'GET',
  '/payment-pending-allocations/:id',
  TApiDataResponse<TPaymentPendingAllocation>,
  void,
  TIdParam
>

/** POST /payment-pending-allocations/:id/allocate - Allocate to quota */
export type TPaymentPendingAllocationsAllocateEndpoint = TEndpointDefinition<
  'POST',
  '/payment-pending-allocations/:id/allocate',
  TApiDataMessageResponse<TPaymentPendingAllocation>,
  TAllocateToQuotaBody,
  TIdParam
>

/** POST /payment-pending-allocations/:id/refund - Mark as refunded */
export type TPaymentPendingAllocationsRefundEndpoint = TEndpointDefinition<
  'POST',
  '/payment-pending-allocations/:id/refund',
  TApiDataMessageResponse<TPaymentPendingAllocation>,
  TRefundBody,
  TIdParam
>

export type TPaymentPendingAllocationsEndpoints = {
  list: TPaymentPendingAllocationsListEndpoint
  getByPayment: TPaymentPendingAllocationsGetByPaymentEndpoint
  getById: TPaymentPendingAllocationsGetByIdEndpoint
  allocate: TPaymentPendingAllocationsAllocateEndpoint
  refund: TPaymentPendingAllocationsRefundEndpoint
}
