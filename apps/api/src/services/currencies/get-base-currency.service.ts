import type { TCurrency } from '@packages/domain'
import type { CurrenciesRepository } from '@database/repositories'
import { type TServiceResult, success, failure } from '../base.service'

export class GetBaseCurrencyService {
  constructor(private readonly repository: CurrenciesRepository) {}

  async execute(): Promise<TServiceResult<TCurrency>> {
    const currency = await this.repository.getBaseCurrency()

    if (!currency) {
      return failure('No base currency configured', 'NOT_FOUND')
    }

    return success(currency)
  }
}
