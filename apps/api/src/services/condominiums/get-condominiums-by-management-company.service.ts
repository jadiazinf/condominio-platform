import type { TCondominium } from '@packages/domain'
import type { CondominiumsRepository } from '@database/repositories'
import { type TServiceResult, success } from '../base.service'

export interface IGetCondominiumsByManagementCompanyInput {
  managementCompanyId: string
  includeInactive?: boolean
}

export class GetCondominiumsByManagementCompanyService {
  constructor(private readonly repository: CondominiumsRepository) {}

  async execute(
    input: IGetCondominiumsByManagementCompanyInput
  ): Promise<TServiceResult<TCondominium[]>> {
    const condominiums = await this.repository.getByManagementCompanyId(
      input.managementCompanyId,
      input.includeInactive
    )
    return success(condominiums)
  }
}
