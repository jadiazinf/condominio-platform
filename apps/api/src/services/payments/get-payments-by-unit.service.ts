import type { TPayment } from '@packages/domain'
import type { PaymentsRepository } from '@database/repositories'
import { type TServiceResult, success } from '../base.service'

export interface IGetPaymentsByUnitInput {
  unitId: string
}

export class GetPaymentsByUnitService {
  constructor(private readonly repository: PaymentsRepository) {}

  async execute(input: IGetPaymentsByUnitInput): Promise<TServiceResult<TPayment[]>> {
    const payments = await this.repository.getByUnitId(input.unitId)
    return success(payments)
  }
}
