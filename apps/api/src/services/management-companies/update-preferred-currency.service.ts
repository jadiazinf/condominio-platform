import type { TManagementCompany } from '@packages/domain'
import type { ManagementCompaniesRepository, CurrenciesRepository } from '@database/repositories'
import { type TServiceResult, success, failure } from '../base.service'

export interface IUpdatePreferredCurrencyInput {
  managementCompanyId: string
  currencyId: string | null
}

export class UpdatePreferredCurrencyService {
  constructor(
    private readonly companiesRepo: ManagementCompaniesRepository,
    private readonly currenciesRepo: CurrenciesRepository
  ) {}

  async execute(input: IUpdatePreferredCurrencyInput): Promise<TServiceResult<TManagementCompany>> {
    const company = await this.companiesRepo.getById(input.managementCompanyId)
    if (!company) {
      return failure('Management company not found', 'NOT_FOUND')
    }

    if (input.currencyId !== null) {
      const currency = await this.currenciesRepo.getById(input.currencyId)
      if (!currency) {
        return failure('Currency not found', 'NOT_FOUND')
      }
      if (!currency.isActive) {
        return failure('Currency is inactive', 'BAD_REQUEST')
      }
    }

    const updated = await this.companiesRepo.update(input.managementCompanyId, {
      preferredCurrencyId: input.currencyId,
    })

    if (!updated) {
      return failure('Failed to update management company', 'INTERNAL_ERROR')
    }

    return success(updated)
  }
}
