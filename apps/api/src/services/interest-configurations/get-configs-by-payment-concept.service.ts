import type { TInterestConfiguration } from '@packages/domain'
import type { InterestConfigurationsRepository } from '@database/repositories'
import { type TServiceResult, success } from '../base.service'

export interface IGetConfigsByPaymentConceptInput {
  paymentConceptId: string
  includeInactive?: boolean
}

export class GetConfigsByPaymentConceptService {
  constructor(private readonly repository: InterestConfigurationsRepository) {}

  async execute(input: IGetConfigsByPaymentConceptInput): Promise<TServiceResult<TInterestConfiguration[]>> {
    const configs = await this.repository.getByPaymentConceptId(
      input.paymentConceptId,
      input.includeInactive
    )
    return success(configs)
  }
}
