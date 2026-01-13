import type { TPayment } from '@packages/domain'
import type { PaymentsRepository } from '@database/repositories'
import { type TServiceResult, success, failure } from '../base.service'

export interface IMarkPaymentAsFailedInput {
  paymentId: string
  failureReason: string
  updatedByUserId: string
}

export interface IMarkPaymentAsFailedOutput {
  payment: TPayment
  message: string
}

/**
 * Service for marking a payment as failed.
 * Changes status from 'pending' to 'failed'.
 * Only payments in 'pending' status can be marked as failed.
 * This is typically used when automatic payment processing fails.
 */
export class MarkPaymentAsFailedService {
  constructor(private readonly repository: PaymentsRepository) {}

  async execute(
    input: IMarkPaymentAsFailedInput
  ): Promise<TServiceResult<IMarkPaymentAsFailedOutput>> {
    const { paymentId, failureReason, updatedByUserId } = input

    // 1. Get the payment
    const existingPayment = await this.repository.getById(paymentId)
    if (!existingPayment) {
      return failure('Payment not found', 'NOT_FOUND')
    }

    // 2. Verify payment is in pending status
    if (existingPayment.status !== 'pending') {
      return failure(
        `Payment cannot be marked as failed. Current status: ${existingPayment.status}`,
        'BAD_REQUEST'
      )
    }

    // 3. Validate failure reason is provided
    if (!failureReason || failureReason.trim().length === 0) {
      return failure('Failure reason is required', 'BAD_REQUEST')
    }

    // 4. Update payment status to failed
    const payment = await this.repository.update(paymentId, {
      status: 'failed',
      notes: failureReason,
    })

    if (!payment) {
      return failure('Failed to update payment', 'INTERNAL_ERROR')
    }

    return success({
      payment,
      message: 'Payment marked as failed',
    })
  }
}
