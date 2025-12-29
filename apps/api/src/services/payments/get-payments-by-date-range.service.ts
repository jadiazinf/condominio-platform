import type { TPayment } from '@packages/domain'
import type { PaymentsRepository } from '@database/repositories'
import { type TServiceResult, success } from '../base.service'

export interface IGetPaymentsByDateRangeInput {
  startDate: string
  endDate: string
}

export class GetPaymentsByDateRangeService {
  constructor(private readonly repository: PaymentsRepository) {}

  async execute(input: IGetPaymentsByDateRangeInput): Promise<TServiceResult<TPayment[]>> {
    const payments = await this.repository.getByDateRange(input.startDate, input.endDate)
    return success(payments)
  }
}
