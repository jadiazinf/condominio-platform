import type { TPayment } from '@packages/domain'
import type { PaymentsRepository } from '@database/repositories'
import type { EventLogger } from '@packages/services'
import { type TServiceResult, success, failure } from '../base.service'

export interface IRejectPaymentInput {
  paymentId: string
  rejectedByUserId: string
  notes?: string
}

export interface IRejectPaymentOutput {
  payment: TPayment
  message: string
}

/**
 * Service for rejecting a payment.
 * Changes status from 'pending_verification' to 'rejected'.
 * Only payments in 'pending_verification' status can be rejected.
 */
export class RejectPaymentService {
  constructor(
    private readonly repository: PaymentsRepository,
    private readonly eventLogger?: EventLogger
  ) {}

  async execute(input: IRejectPaymentInput): Promise<TServiceResult<IRejectPaymentOutput>> {
    const startTime = Date.now()
    const result = await this.executeInternal(input)
    const durationMs = Date.now() - startTime

    if (this.eventLogger) {
      if (result.success) {
        this.eventLogger.warn({
          category: 'payment',
          event: 'payment.rejected',
          action: 'reject_payment',
          message: `Payment ${input.paymentId} rejected`,
          module: 'RejectPaymentService',
          entityType: 'payment',
          entityId: input.paymentId,
          userId: input.rejectedByUserId,
          result: 'failure',
          durationMs,
        })
      } else {
        this.eventLogger.error({
          category: 'payment',
          event: 'payment.reject.failed',
          action: 'reject_payment',
          message: `Payment rejection failed: ${result.error}`,
          module: 'RejectPaymentService',
          entityType: 'payment',
          entityId: input.paymentId,
          userId: input.rejectedByUserId,
          errorCode: result.code,
          errorMessage: result.error,
          durationMs,
        })
      }
    }

    return result
  }

  private async executeInternal(
    input: IRejectPaymentInput
  ): Promise<TServiceResult<IRejectPaymentOutput>> {
    const existingPayment = await this.repository.getById(input.paymentId)

    if (!existingPayment) {
      return failure('Payment not found', 'NOT_FOUND')
    }

    if (existingPayment.status !== 'pending_verification') {
      return failure(
        `Payment is not pending verification. Current status: ${existingPayment.status}`,
        'BAD_REQUEST'
      )
    }

    const payment = await this.repository.rejectPayment(
      input.paymentId,
      input.rejectedByUserId,
      input.notes
    )

    if (!payment) {
      return failure('Payment not found', 'NOT_FOUND')
    }

    return success({
      payment,
      message: 'Payment rejected',
    })
  }
}
