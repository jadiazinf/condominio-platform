import type { TPayment } from '@packages/domain'
import type {
  PaymentsRepository,
  PaymentApplicationsRepository,
  QuotasRepository,
  QuotaAdjustmentsRepository,
  PaymentPendingAllocationsRepository,
} from '@database/repositories'
import type { TDrizzleClient } from '@database/repositories/interfaces'
import type { EventLogger } from '@packages/services'
import { type TServiceResult, success, failure } from '../base.service'
import { parseAmount, toDecimal } from '@packages/utils/money'
import logger from '@utils/logger'

export interface IRefundPaymentInput {
  paymentId: string
  refundReason: string
  refundedByUserId: string
}

export interface IRefundPaymentOutput {
  payment: TPayment
  reversedApplications: number
  message: string
}

/**
 * Service for refunding a completed payment.
 * Changes status from 'completed' to 'refunded'.
 * Reverses all payment applications and restores quota balances.
 */
export class RefundPaymentService {
  constructor(
    private readonly db: TDrizzleClient,
    private readonly repository: PaymentsRepository,
    private readonly paymentApplicationsRepository: PaymentApplicationsRepository,
    private readonly quotasRepository: QuotasRepository,
    private readonly quotaAdjustmentsRepository?: QuotaAdjustmentsRepository,
    private readonly paymentPendingAllocationsRepository?: PaymentPendingAllocationsRepository,
    private readonly eventLogger?: EventLogger
  ) {}

  async execute(input: IRefundPaymentInput): Promise<TServiceResult<IRefundPaymentOutput>> {
    const startTime = Date.now()
    const result = await this.executeInternal(input)
    const durationMs = Date.now() - startTime

    if (this.eventLogger) {
      if (result.success) {
        this.eventLogger.warn({
          category: 'payment',
          event: 'payment.refunded',
          action: 'refund_payment',
          message: `Payment ${input.paymentId} refunded (${result.data.reversedApplications} applications reversed)`,
          module: 'RefundPaymentService',
          entityType: 'payment',
          entityId: input.paymentId,
          userId: input.refundedByUserId,
          result: 'success',
          metadata: {
            reversedApplications: result.data.reversedApplications,
            refundReason: input.refundReason,
          },
          durationMs,
        })
      } else {
        this.eventLogger.error({
          category: 'payment',
          event: 'payment.refund.failed',
          action: 'refund_payment',
          message: `Payment refund failed: ${result.error}`,
          module: 'RefundPaymentService',
          entityType: 'payment',
          entityId: input.paymentId,
          userId: input.refundedByUserId,
          errorCode: result.code,
          errorMessage: result.error,
          durationMs,
        })
      }
    }

    return result
  }

  private async executeInternal(
    input: IRefundPaymentInput
  ): Promise<TServiceResult<IRefundPaymentOutput>> {
    const { paymentId, refundReason, refundedByUserId } = input

    // 1. Get the payment (read outside transaction)
    const existingPayment = await this.repository.getById(paymentId)
    if (!existingPayment) {
      return failure('Payment not found', 'NOT_FOUND')
    }

    // 2. Verify payment is completed
    if (existingPayment.status !== 'completed') {
      return failure(
        `Only completed payments can be refunded. Current status: ${existingPayment.status}`,
        'BAD_REQUEST'
      )
    }

    // 3. Validate refund reason
    if (!refundReason || refundReason.trim().length === 0) {
      return failure('Refund reason is required for audit trail', 'BAD_REQUEST')
    }

    // 4. Get payment applications (read outside transaction)
    const applications = await this.paymentApplicationsRepository.getByPaymentId(paymentId)

    // 5. All writes inside a transaction
    return await this.db.transaction(async tx => {
      const txPaymentsRepo = this.repository.withTx(tx)
      const txApplicationsRepo = this.paymentApplicationsRepository.withTx(tx)
      const txQuotasRepo = this.quotasRepository.withTx(tx)
      const txAdjustmentsRepo = this.quotaAdjustmentsRepository?.withTx(tx)
      const txPendingAllocationsRepo = this.paymentPendingAllocationsRepository?.withTx(tx)

      // 5a. Reverse each payment application
      for (const application of applications) {
        // Restore quota balance
        const quota = await txQuotasRepo.getById(application.quotaId)
        if (quota) {
          // Reverse discount/surcharge adjustments via adjustmentsTotal
          // baseAmount is NEVER mutated — only adjustmentsTotal tracks changes
          let currentAdjTotal = parseAmount(quota.adjustmentsTotal)
          let adjTotalChanged = false
          if (txAdjustmentsRepo) {
            const adjustments = await txAdjustmentsRepo.getByQuotaId(application.quotaId)
            const reversibleTags = ['early_discount', 'late_surcharge']
            const existingReversalTags = new Set(
              adjustments.filter(a => a.tag?.startsWith('reversal_')).map(a => a.tag)
            )

            for (const adj of adjustments) {
              if (!adj.tag || !reversibleTags.includes(adj.tag)) continue
              if (existingReversalTags.has(`reversal_${adj.tag}`)) continue

              // Reverse the adjustment effect on adjustmentsTotal
              const delta = parseAmount(adj.newAmount) - parseAmount(adj.previousAmount)
              currentAdjTotal -= delta
              adjTotalChanged = true

              // Create reversal record
              await txAdjustmentsRepo.create({
                quotaId: adj.quotaId,
                previousAmount: adj.newAmount,
                newAmount: adj.previousAmount,
                adjustmentType: adj.adjustmentType === 'discount' ? 'increase' : 'discount',
                reason: `Reversión por reembolso de pago (original: ${adj.reason})`,
                tag: `reversal_${adj.tag}`,
                createdBy: refundedByUserId,
              })
            }
          }

          const baseAmount = parseAmount(quota.baseAmount)
          const effectiveAmount = baseAmount + currentAdjTotal
          const currentPaid = parseAmount(quota.paidAmount)
          const appliedAmount = parseAmount(application.appliedAmount)
          const newPaid = Math.max(0, currentPaid - appliedAmount)
          const interestAmount = parseAmount(quota.interestAmount)
          const totalDue = effectiveAmount + interestAmount
          const newBalance = toDecimal(totalDue - newPaid)

          const updateData: Record<string, unknown> = {
            paidAmount: toDecimal(newPaid),
            balance: newBalance,
            status: newPaid === 0 ? 'pending' : 'partial',
          }

          // Only include adjustmentsTotal if it was actually changed
          if (adjTotalChanged) {
            updateData.adjustmentsTotal = toDecimal(currentAdjTotal)
          }

          await txQuotasRepo.update(quota.id, updateData)
        }

        // Delete the payment application
        await txApplicationsRepo.hardDelete(application.id)
      }

      // 5b. Mark pending allocations as refunded
      if (txPendingAllocationsRepo) {
        const pendingAllocations = await txPendingAllocationsRepo.getPendingByPaymentId(paymentId)
        for (const allocation of pendingAllocations) {
          await txPendingAllocationsRepo.update(allocation.id, {
            status: 'refunded',
            resolutionType: 'refunded',
            resolutionNotes: `Refunded as part of payment refund: ${refundReason}`,
          })
        }
      }

      // 5c. Update payment status (atomic: only if still 'completed')
      const payment = await txPaymentsRepo.update(paymentId, {
        status: 'refunded',
        notes: `[REFUND] ${refundReason} | Refunded by: ${refundedByUserId} | ${new Date().toISOString()}`,
      })

      if (!payment) {
        return failure('Failed to update payment status', 'INTERNAL_ERROR')
      }

      logger.info(
        { paymentId, reversedApplications: applications.length, refundedBy: refundedByUserId },
        'Payment refunded successfully with application reversals'
      )

      return success({
        payment,
        reversedApplications: applications.length,
        message: `Payment refunded. ${applications.length} quota application(s) reversed.`,
      })
    })
  }
}
