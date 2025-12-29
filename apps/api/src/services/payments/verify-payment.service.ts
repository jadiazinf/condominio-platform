import type { TPayment } from '@packages/domain'
import type { PaymentsRepository } from '@database/repositories'
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
  constructor(private readonly repository: PaymentsRepository) {}

  async execute(input: IVerifyPaymentInput): Promise<TServiceResult<IVerifyPaymentOutput>> {
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
