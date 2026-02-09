import type { TPayment } from '@packages/domain'
import type { PaymentsRepository, PaymentApplicationsRepository, QuotasRepository } from '@database/repositories'
import type { TDrizzleClient } from '@database/repositories/interfaces'
import { type TServiceResult, success, failure } from '../base.service'
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
    private readonly quotasRepository: QuotasRepository
  ) {}

  async execute(input: IRefundPaymentInput): Promise<TServiceResult<IRefundPaymentOutput>> {
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
    return await this.db.transaction(async (tx) => {
      const txPaymentsRepo = this.repository.withTx(tx)
      const txApplicationsRepo = this.paymentApplicationsRepository.withTx(tx)
      const txQuotasRepo = this.quotasRepository.withTx(tx)

      // 5a. Reverse each payment application
      for (const application of applications) {
        // Restore quota balance
        const quota = await txQuotasRepo.getById(application.quotaId)
        if (quota) {
          const currentPaid = parseFloat(quota.paidAmount ?? '0')
          const appliedAmount = parseFloat(application.appliedAmount)
          const newPaid = Math.max(0, currentPaid - appliedAmount)
          const baseAmount = parseFloat(quota.baseAmount)
          const interestAmount = parseFloat(quota.interestAmount ?? '0')
          const totalDue = baseAmount + interestAmount
          const newBalance = (totalDue - newPaid).toFixed(2)

          await txQuotasRepo.update(quota.id, {
            paidAmount: newPaid.toFixed(2),
            balance: newBalance,
            status: newPaid === 0 ? 'pending' : 'pending',
          })
        }

        // Delete the payment application
        await txApplicationsRepo.hardDelete(application.id)
      }

      // 5b. Update payment status (atomic: only if still 'completed')
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
