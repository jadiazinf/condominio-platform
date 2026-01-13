import type { TInterestConfiguration } from '@packages/domain'
import type { InterestConfigurationsRepository } from '@database/repositories'
import { type TServiceResult, success } from '../base.service'

export interface IGetActiveConfigForDateInput {
  paymentConceptId: string
  date: string
}

export class GetActiveConfigForDateService {
  constructor(private readonly repository: InterestConfigurationsRepository) {}

  async execute(
    input: IGetActiveConfigForDateInput
  ): Promise<TServiceResult<TInterestConfiguration | null>> {
    const config = await this.repository.getActiveForDate(input.paymentConceptId, input.date)
    return success(config)
  }
}
