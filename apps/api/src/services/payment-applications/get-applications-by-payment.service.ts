import type { TPaymentApplication } from '@packages/domain'
import type { PaymentApplicationsRepository } from '@database/repositories'
import { type TServiceResult, success } from '../base.service'

export interface IGetApplicationsByPaymentInput {
  paymentId: string
}

export class GetApplicationsByPaymentService {
  constructor(private readonly repository: PaymentApplicationsRepository) {}

  async execute(input: IGetApplicationsByPaymentInput): Promise<TServiceResult<TPaymentApplication[]>> {
    const applications = await this.repository.getByPaymentId(input.paymentId)
    return success(applications)
  }
}
