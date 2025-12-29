import type { TPayment } from '@packages/domain'
import type { PaymentsRepository } from '@database/repositories'
import { type TServiceResult, success } from '../base.service'

export interface IGetPaymentsByUserInput {
  userId: string
}

export class GetPaymentsByUserService {
  constructor(private readonly repository: PaymentsRepository) {}

  async execute(input: IGetPaymentsByUserInput): Promise<TServiceResult<TPayment[]>> {
    const payments = await this.repository.getByUserId(input.userId)
    return success(payments)
  }
}
