import type { TExchangeRate } from '@packages/domain'
import type { ExchangeRatesRepository } from '@database/repositories'
import { type TServiceResult, success } from '../base.service'

export interface IGetRatesByDateInput {
  effectiveDate: string
}

export class GetRatesByDateService {
  constructor(private readonly repository: ExchangeRatesRepository) {}

  async execute(input: IGetRatesByDateInput): Promise<TServiceResult<TExchangeRate[]>> {
    const rates = await this.repository.getByDate(input.effectiveDate)
    return success(rates)
  }
}
