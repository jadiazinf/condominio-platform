import type { TPayment } from '@packages/domain'
import type { PaymentsRepository } from '@database/repositories'
import { type TServiceResult, success, failure } from '../base.service'

export interface IRefundPaymentInput {
  paymentId: string
  refundReason: string
  refundedByUserId: string
}

export interface IRefundPaymentOutput {
  payment: TPayment
  message: string
}

/**
 * Service for refunding a completed payment.
 * Changes status from 'completed' to 'refunded'.
 * Only payments in 'completed' status can be refunded.
 * This requires administrative approval and a clear reason for auditing.
 */
export class RefundPaymentService {
  constructor(private readonly repository: PaymentsRepository) {}

  async execute(input: IRefundPaymentInput): Promise<TServiceResult<IRefundPaymentOutput>> {
    const { paymentId, refundReason, refundedByUserId } = input

    // 1. Get the payment
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

    // 3. Validate refund reason is provided (required for audit trail)
    if (!refundReason || refundReason.trim().length === 0) {
      return failure('Refund reason is required for audit trail', 'BAD_REQUEST')
    }

    // 4. Update payment status to refunded
    const payment = await this.repository.update(paymentId, {
      status: 'refunded',
      notes: refundReason,
    })

    if (!payment) {
      return failure('Failed to update payment', 'INTERNAL_ERROR')
    }

    return success({
      payment,
      message: 'Payment refunded successfully',
    })
  }
}
