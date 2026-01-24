import type { TManagementCompany } from '@packages/domain'
import type { ManagementCompaniesRepository } from '@database/repositories'
import { type TServiceResult, success, failure } from '../base.service'

export interface IGetCompanyByTaxIdNumberInput {
  taxIdNumber: string
}

export class GetCompanyByTaxIdNumberService {
  constructor(private readonly repository: ManagementCompaniesRepository) {}

  async execute(input: IGetCompanyByTaxIdNumberInput): Promise<TServiceResult<TManagementCompany>> {
    const company = await this.repository.getByTaxIdNumber(input.taxIdNumber)

    if (!company) {
      return failure('Management company not found', 'NOT_FOUND')
    }

    return success(company)
  }
}
