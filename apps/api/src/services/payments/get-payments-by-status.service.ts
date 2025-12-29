import type { TPayment } from '@packages/domain'
import type { PaymentsRepository } from '@database/repositories'
import { type TServiceResult, success } from '../base.service'

export interface IGetPaymentsByStatusInput {
  status: TPayment['status']
}

export class GetPaymentsByStatusService {
  constructor(private readonly repository: PaymentsRepository) {}

  async execute(input: IGetPaymentsByStatusInput): Promise<TServiceResult<TPayment[]>> {
    const payments = await this.repository.getByStatus(input.status)
    return success(payments)
  }
}
