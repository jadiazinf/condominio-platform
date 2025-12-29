import type { TCurrency } from '@packages/domain'
import type { CurrenciesRepository } from '@database/repositories'
import { type TServiceResult, success, failure } from '../base.service'

export interface IGetCurrencyByCodeInput {
  code: string
}

export class GetCurrencyByCodeService {
  constructor(private readonly repository: CurrenciesRepository) {}

  async execute(input: IGetCurrencyByCodeInput): Promise<TServiceResult<TCurrency>> {
    const currency = await this.repository.getByCode(input.code)

    if (!currency) {
      return failure('Currency not found', 'NOT_FOUND')
    }

    return success(currency)
  }
}
