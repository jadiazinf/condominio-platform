import type { TPayment, TPaymentCreate } from '@packages/domain'
import type { PaymentsRepository } from '@database/repositories'
import { type TServiceResult, success } from '../base.service'

export interface IReportPaymentInput {
  paymentData: TPaymentCreate
  registeredByUserId: string
}

/**
 * Service for reporting external payments.
 * Creates a payment with 'pending_verification' status that requires admin approval.
 */
export class ReportPaymentService {
  constructor(private readonly repository: PaymentsRepository) {}

  async execute(input: IReportPaymentInput): Promise<TServiceResult<TPayment>> {
    const paymentData: TPaymentCreate = {
      ...input.paymentData,
      status: 'pending_verification',
      registeredBy: input.registeredByUserId,
    }

    const payment = await this.repository.create(paymentData)
    return success(payment)
  }
}
