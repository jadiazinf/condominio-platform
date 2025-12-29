import type { TPayment } from '@packages/domain'
import type { PaymentsRepository } from '@database/repositories'
import { type TServiceResult, success, failure } from '../base.service'

export interface IGetPaymentByNumberInput {
  paymentNumber: string
}

export class GetPaymentByNumberService {
  constructor(private readonly repository: PaymentsRepository) {}

  async execute(input: IGetPaymentByNumberInput): Promise<TServiceResult<TPayment>> {
    const payment = await this.repository.getByPaymentNumber(input.paymentNumber)

    if (!payment) {
      return failure('Payment not found', 'NOT_FOUND')
    }

    return success(payment)
  }
}
