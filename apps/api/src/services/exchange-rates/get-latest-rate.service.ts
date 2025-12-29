import type { TExchangeRate } from '@packages/domain'
import type { ExchangeRatesRepository } from '@database/repositories'
import { type TServiceResult, success, failure } from '../base.service'

export interface IGetLatestRateInput {
  fromCurrencyId: string
  toCurrencyId: string
}

export class GetLatestRateService {
  constructor(private readonly repository: ExchangeRatesRepository) {}

  async execute(input: IGetLatestRateInput): Promise<TServiceResult<TExchangeRate>> {
    const rate = await this.repository.getLatestRate(input.fromCurrencyId, input.toCurrencyId)

    if (!rate) {
      return failure('Exchange rate not found', 'NOT_FOUND')
    }

    return success(rate)
  }
}
