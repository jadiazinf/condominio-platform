import type { TUserManagementCompaniesResponse } from '@packages/domain'
import type { ManagementCompanyMembersRepository } from '@database/repositories'
import { type TServiceResult, success } from '../base.service'

export interface IGetUserManagementCompaniesInput {
  userId: string
}

/**
 * Service for retrieving all management companies a user is a member of.
 * Returns active memberships with company info, role, and permissions.
 */
export class GetUserManagementCompaniesService {
  constructor(
    private readonly membersRepository: ManagementCompanyMembersRepository
  ) {}

  async execute(
    input: IGetUserManagementCompaniesInput
  ): Promise<TServiceResult<TUserManagementCompaniesResponse>> {
    const memberships = await this.membersRepository.listByUserIdWithCompany(input.userId)

    const managementCompanies = memberships.map(m => ({
      memberId: m.id,
      managementCompanyId: m.managementCompanyInfo.id,
      managementCompanyName: m.managementCompanyInfo.name,
      managementCompanyLogoUrl: m.managementCompanyInfo.logoUrl,
      roleName: m.roleName,
      isPrimaryAdmin: m.isPrimaryAdmin,
      permissions: m.permissions,
    }))

    return success({ managementCompanies })
  }
}
