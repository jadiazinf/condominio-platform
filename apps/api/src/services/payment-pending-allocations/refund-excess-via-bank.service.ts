import type { TPaymentPendingAllocation } from '@packages/domain'
import type {
  PaymentPendingAllocationsRepository,
  PaymentsRepository,
  PaymentGatewaysRepository,
  EntityPaymentGatewaysRepository,
} from '@database/repositories'
import type { GatewayTransactionsRepository } from '@database/repositories/gateway-transactions.repository'
import type { PaymentGatewayManager } from '../payment-gateways/gateway-manager'
import { type TServiceResult, success, failure } from '../base.service'
import logger from '@packages/logger'

export type TRefundExcessViaBankInput = {
  allocationId: string
  /** Admin user who triggers the refund */
  refundedByUserId: string
  resolutionNotes?: string
}

export interface IRefundExcessViaBankOutput {
  allocation: TPaymentPendingAllocation
  refundId: string | null
  refundStatus: string
}

/**
 * Refunds an excess payment amount (vuelto) through the bank gateway.
 *
 * Handles bank unavailability gracefully:
 *
 * - adapter.refund() returns `completed`  → allocation marked `refunded`
 * - adapter.refund() returns `initiated`  → allocation marked `refund_pending`
 *     (bank accepted but hasn't confirmed — webhook will confirm later)
 * - adapter.refund() returns `failed` + retryable → allocation stays `pending`,
 *     error recorded in gateway_transactions, admin can retry
 * - adapter.refund() returns `failed` + not retryable → allocation marked `refund_failed`
 * - adapter.refund() throws (timeout/network) → allocation stays `pending`,
 *     error recorded, admin can retry
 */
export class RefundExcessViaBankService {
  constructor(
    private readonly pendingAllocationsRepo: PaymentPendingAllocationsRepository,
    private readonly paymentsRepo: PaymentsRepository,
    private readonly paymentGatewaysRepo: PaymentGatewaysRepository,
    private readonly entityPaymentGatewaysRepo: EntityPaymentGatewaysRepository,
    private readonly gatewayTransactionsRepo: GatewayTransactionsRepository,
    private readonly gatewayManager: PaymentGatewayManager,
  ) {}

  async execute(
    input: TRefundExcessViaBankInput
  ): Promise<TServiceResult<IRefundExcessViaBankOutput>> {
    const { allocationId, refundedByUserId, resolutionNotes } = input

    // 1. Get and validate pending allocation
    const allocation = await this.pendingAllocationsRepo.getById(allocationId)
    if (!allocation) {
      return failure('Pending allocation not found', 'NOT_FOUND')
    }

    // Allow retry from pending or refund_failed
    if (allocation.status !== 'pending' && allocation.status !== 'refund_failed') {
      return failure(
        `Allocation cannot be refunded in status: ${allocation.status}`,
        'BAD_REQUEST'
      )
    }

    // 2. Get the original payment
    const payment = await this.paymentsRepo.getById(allocation.paymentId)
    if (!payment) {
      return failure('Original payment not found', 'NOT_FOUND')
    }

    // 3. Resolve gateway config
    const gatewayConfig = await this.resolveGatewayConfig(payment)
    if (!gatewayConfig) {
      return failure(
        'No bank gateway configured for this payment. Cannot process refund.',
        'BAD_REQUEST'
      )
    }

    const { adapter, config, gatewayType } = gatewayConfig

    // 4. Find the original gateway transaction for the externalTransactionId
    const gatewayTxs = await this.gatewayTransactionsRepo.getByPaymentId(allocation.paymentId)
    const completedTx = gatewayTxs.find(tx => tx.status === 'completed')
    const externalTxId = completedTx?.externalTransactionId ?? `manual_${allocation.paymentId}`

    // 5. Call adapter.refund() — handle network/timeout errors
    let refundResult
    try {
      refundResult = await adapter.refund({
        externalTransactionId: externalTxId,
        amount: allocation.pendingAmount,
        reason: resolutionNotes ?? `Excess payment refund (vuelto) for payment ${allocation.paymentId}`,
        gatewayConfiguration: config,
      })
    } catch (error) {
      // Network error, timeout, bank unreachable
      logger.error(
        { error, allocationId, paymentId: allocation.paymentId },
        '[RefundExcess] Gateway refund call failed (network/timeout)'
      )

      // Record the failed attempt for audit
      await this.gatewayTransactionsRepo.create({
        paymentId: allocation.paymentId,
        gatewayType,
        externalTransactionId: null,
        externalReference: externalTxId,
        requestPayload: {
          type: 'excess_refund',
          allocationId,
          amount: allocation.pendingAmount,
          originalExternalTxId: externalTxId,
        },
        responsePayload: { error: String(error) },
        status: 'failed',
        attempts: 1,
        maxAttempts: 1,
        lastAttemptAt: new Date(),
        verifiedAt: null,
        errorMessage: 'Bank unavailable or network error. Refund was not processed.',
      })

      // Allocation stays in current status — admin can retry
      return failure(
        'El banco no está disponible en este momento. El reembolso no fue procesado. Puede reintentar más tarde.',
        'INTERNAL_ERROR'
      )
    }

    // 6. Create gateway transaction audit record
    const gatewayTxStatus = refundResult.status === 'completed' ? 'completed'
      : refundResult.status === 'failed' ? 'failed'
      : 'initiated'

    await this.gatewayTransactionsRepo.create({
      paymentId: allocation.paymentId,
      gatewayType,
      externalTransactionId: refundResult.refundId ?? null,
      externalReference: externalTxId,
      requestPayload: {
        type: 'excess_refund',
        allocationId,
        amount: allocation.pendingAmount,
        originalExternalTxId: externalTxId,
      },
      responsePayload: refundResult.rawResponse,
      status: gatewayTxStatus,
      attempts: 1,
      maxAttempts: 1,
      lastAttemptAt: new Date(),
      verifiedAt: refundResult.status === 'completed' ? new Date() : null,
      errorMessage: refundResult.errorMessage ?? null,
    })

    // 7. Update allocation based on refund result
    let newAllocationStatus: 'refunded' | 'refund_pending' | 'refund_failed' | 'pending'
    let responseMessage: string

    switch (refundResult.status) {
      case 'completed':
        // Bank confirmed the refund immediately
        newAllocationStatus = 'refunded'
        responseMessage = 'Reembolso completado exitosamente.'
        break

      case 'initiated':
        // Bank accepted but hasn't confirmed yet (async — webhook will confirm)
        newAllocationStatus = 'refund_pending'
        responseMessage = 'Reembolso iniciado. Pendiente de confirmación del banco.'
        break

      case 'failed':
        if (refundResult.retryable) {
          // Transient failure (maintenance, rate limit, etc.) — keep as pending for retry
          newAllocationStatus = allocation.status as 'pending' | 'refund_failed'
          responseMessage = `El banco rechazó temporalmente el reembolso: ${refundResult.errorMessage ?? 'error desconocido'}. Puede reintentar más tarde.`
        } else {
          // Permanent failure (invalid account, etc.)
          newAllocationStatus = 'refund_failed'
          responseMessage = `El banco rechazó el reembolso: ${refundResult.errorMessage ?? 'error desconocido'}. Contacte al banco o asigne el excedente a una cuota.`
        }
        break
    }

    // Only update allocation if status changed
    let updatedAllocation = allocation
    if (newAllocationStatus !== allocation.status) {
      const updated = await this.pendingAllocationsRepo.update(allocationId, {
        status: newAllocationStatus,
        resolutionType: newAllocationStatus === 'refunded' ? 'refunded' : `refund_${refundResult.status}`,
        resolutionNotes: resolutionNotes ?? `${responseMessage} (via ${gatewayType})`,
        allocatedBy: refundedByUserId,
      })

      if (!updated) {
        return failure('Failed to update allocation status', 'INTERNAL_ERROR')
      }
      updatedAllocation = updated
    }

    logger.info(
      {
        allocationId,
        paymentId: allocation.paymentId,
        amount: allocation.pendingAmount,
        refundId: refundResult.refundId,
        refundStatus: refundResult.status,
        allocationStatus: newAllocationStatus,
        retryable: refundResult.retryable,
      },
      '[RefundExcess] Refund attempt processed'
    )

    // Return failure for failed refunds so the caller knows
    if (refundResult.status === 'failed') {
      return failure(responseMessage, 'BAD_REQUEST')
    }

    return success({
      allocation: updatedAllocation,
      refundId: refundResult.refundId,
      refundStatus: refundResult.status,
    })
  }

  /**
   * Resolves the gateway adapter and config for a payment.
   */
  private async resolveGatewayConfig(payment: { paymentGatewayId: string | null; unitId: string }) {
    if (payment.paymentGatewayId) {
      const gateway = await this.paymentGatewaysRepo.getById(payment.paymentGatewayId)
      if (gateway && gateway.isActive && this.gatewayManager.hasAdapter(gateway.gatewayType)) {
        return {
          adapter: this.gatewayManager.getAdapter(gateway.gatewayType),
          config: (gateway.configuration as Record<string, unknown>) ?? {},
          gatewayType: gateway.gatewayType,
        }
      }
    }

    return null
  }
}
