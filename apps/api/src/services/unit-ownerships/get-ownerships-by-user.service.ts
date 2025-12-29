import type { TUnitOwnership } from '@packages/domain'
import type { UnitOwnershipsRepository } from '@database/repositories'
import { type TServiceResult, success } from '../base.service'

export interface IGetOwnershipsByUserInput {
  userId: string
  includeInactive?: boolean
}

export class GetOwnershipsByUserService {
  constructor(private readonly repository: UnitOwnershipsRepository) {}

  async execute(input: IGetOwnershipsByUserInput): Promise<TServiceResult<TUnitOwnership[]>> {
    const ownerships = await this.repository.getByUserId(input.userId, input.includeInactive)
    return success(ownerships)
  }
}
