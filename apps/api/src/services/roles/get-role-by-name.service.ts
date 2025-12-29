import type { TRole } from '@packages/domain'
import type { RolesRepository } from '@database/repositories'
import { type TServiceResult, success, failure } from '../base.service'

export interface IGetRoleByNameInput {
  name: string
}

export class GetRoleByNameService {
  constructor(private readonly repository: RolesRepository) {}

  async execute(input: IGetRoleByNameInput): Promise<TServiceResult<TRole>> {
    const role = await this.repository.getByName(input.name)

    if (!role) {
      return failure('Role not found', 'NOT_FOUND')
    }

    return success(role)
  }
}
