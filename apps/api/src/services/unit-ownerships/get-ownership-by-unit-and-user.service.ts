import type { TUnitOwnership } from '@packages/domain'
import type { UnitOwnershipsRepository } from '@database/repositories'
import { type TServiceResult, success, failure } from '../base.service'

export interface IGetOwnershipByUnitAndUserInput {
  unitId: string
  userId: string
}

export class GetOwnershipByUnitAndUserService {
  constructor(private readonly repository: UnitOwnershipsRepository) {}

  async execute(input: IGetOwnershipByUnitAndUserInput): Promise<TServiceResult<TUnitOwnership>> {
    const ownership = await this.repository.getByUnitAndUser(input.unitId, input.userId)

    if (!ownership) {
      return failure('Unit ownership not found', 'NOT_FOUND')
    }

    return success(ownership)
  }
}
