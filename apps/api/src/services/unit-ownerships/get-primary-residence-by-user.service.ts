import type { TUnitOwnership } from '@packages/domain'
import type { UnitOwnershipsRepository } from '@database/repositories'
import { type TServiceResult, success, failure } from '../base.service'

export interface IGetPrimaryResidenceByUserInput {
  userId: string
}

export class GetPrimaryResidenceByUserService {
  constructor(private readonly repository: UnitOwnershipsRepository) {}

  async execute(input: IGetPrimaryResidenceByUserInput): Promise<TServiceResult<TUnitOwnership>> {
    const ownership = await this.repository.getPrimaryResidenceByUser(input.userId)

    if (!ownership) {
      return failure('No primary residence found for user', 'NOT_FOUND')
    }

    return success(ownership)
  }
}
