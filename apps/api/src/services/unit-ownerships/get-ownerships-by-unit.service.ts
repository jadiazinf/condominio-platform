import type { TUnitOwnership } from '@packages/domain'
import type { UnitOwnershipsRepository } from '@database/repositories'
import { type TServiceResult, success } from '../base.service'

export interface IGetOwnershipsByUnitInput {
  unitId: string
  includeInactive?: boolean
}

export class GetOwnershipsByUnitService {
  constructor(private readonly repository: UnitOwnershipsRepository) {}

  async execute(input: IGetOwnershipsByUnitInput): Promise<TServiceResult<TUnitOwnership[]>> {
    const ownerships = await this.repository.getByUnitId(input.unitId, input.includeInactive)
    return success(ownerships)
  }
}
