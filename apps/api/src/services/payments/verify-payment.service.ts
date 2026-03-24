import type { TPayment } from '@packages/domain'
import type { PaymentsRepository } from '@database/repositories'
import type { EventLogger } from '@packages/services'
import { type TServiceResult, success, failure } from '../base.service'

export interface IVerifyPaymentInput {
  paymentId: string
  verifiedByUserId: string
  notes?: string
}

export interface IVerifyPaymentOutput {
  payment: TPayment
  message: string
}

/**
 * Service for verifying (approving) a payment.
 * Changes status from 'pending_verification' to 'completed'.
 * Only payments in 'pending_verification' status can be verified.
 */
export class VerifyPaymentService {
  constructor(
    private readonly repository: PaymentsRepository,
    private readonly eventLogger?: EventLogger
  ) {}

  async execute(input: IVerifyPaymentInput): Promise<TServiceResult<IVerifyPaymentOutput>> {
    const startTime = Date.now()
    const result = await this.executeInternal(input)
    const durationMs = Date.now() - startTime

    if (this.eventLogger) {
      if (result.success) {
        this.eventLogger.info({
          category: 'payment',
          event: 'payment.verified',
          action: 'verify_payment',
          message: `Payment ${input.paymentId} verified`,
          module: 'VerifyPaymentService',
          entityType: 'payment',
          entityId: input.paymentId,
          userId: input.verifiedByUserId,
          durationMs,
        })
      } else {
        this.eventLogger.error({
          category: 'payment',
          event: 'payment.verify.failed',
          action: 'verify_payment',
          message: `Payment verification failed: ${result.error}`,
          module: 'VerifyPaymentService',
          entityType: 'payment',
          entityId: input.paymentId,
          userId: input.verifiedByUserId,
          errorCode: result.code,
          errorMessage: result.error,
          durationMs,
        })
      }
    }

    return result
  }

  private async executeInternal(
    input: IVerifyPaymentInput
  ): Promise<TServiceResult<IVerifyPaymentOutput>> {
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

    const payment = await this.repository.verifyPayment(
      input.paymentId,
      input.verifiedByUserId,
      input.notes
    )

    if (!payment) {
      return failure('Payment not found', 'NOT_FOUND')
    }

    return success({
      payment,
      message: 'Payment verified successfully',
    })
  }
}
