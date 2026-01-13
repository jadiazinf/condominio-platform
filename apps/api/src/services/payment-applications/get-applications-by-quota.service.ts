import type { TPaymentApplication } from '@packages/domain'
import type { PaymentApplicationsRepository } from '@database/repositories'
import { type TServiceResult, success } from '../base.service'

export interface IGetApplicationsByQuotaInput {
  quotaId: string
}

export class GetApplicationsByQuotaService {
  constructor(private readonly repository: PaymentApplicationsRepository) {}

  async execute(
    input: IGetApplicationsByQuotaInput
  ): Promise<TServiceResult<TPaymentApplication[]>> {
    const applications = await this.repository.getByQuotaId(input.quotaId)
    return success(applications)
  }
}
