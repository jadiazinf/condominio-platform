import type { TUnit } from '@packages/domain'
import type { UnitsRepository } from '@database/repositories'
import { type TServiceResult, success } from '../base.service'

export interface IGetUnitsByBuildingInput {
  buildingId: string
}

export class GetUnitsByBuildingService {
  constructor(private readonly repository: UnitsRepository) {}

  async execute(input: IGetUnitsByBuildingInput): Promise<TServiceResult<TUnit[]>> {
    const units = await this.repository.getByBuildingId(input.buildingId)
    return success(units)
  }
}
