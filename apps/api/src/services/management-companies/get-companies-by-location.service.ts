import type { TManagementCompany } from '@packages/domain'
import type { ManagementCompaniesRepository } from '@database/repositories'
import { type TServiceResult, success } from '../base.service'

export interface IGetCompaniesByLocationInput {
  locationId: string
}

export class GetCompaniesByLocationService {
  constructor(private readonly repository: ManagementCompaniesRepository) {}

  async execute(
    input: IGetCompaniesByLocationInput
  ): Promise<TServiceResult<TManagementCompany[]>> {
    const companies = await this.repository.getByLocationId(input.locationId)
    return success(companies)
  }
}
