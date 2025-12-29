import type { TManagementCompany } from '@packages/domain'
import type { ManagementCompaniesRepository } from '@database/repositories'
import { type TServiceResult, success, failure } from '../base.service'

export interface IGetCompanyByTaxIdInput {
  taxId: string
}

export class GetCompanyByTaxIdService {
  constructor(private readonly repository: ManagementCompaniesRepository) {}

  async execute(input: IGetCompanyByTaxIdInput): Promise<TServiceResult<TManagementCompany>> {
    const company = await this.repository.getByTaxId(input.taxId)

    if (!company) {
      return failure('Management company not found', 'NOT_FOUND')
    }

    return success(company)
  }
}
