import type { TUnit } from '@packages/domain'
import type { UnitsRepository } from '@database/repositories'
import { type TServiceResult, success } from '../base.service'

export interface IGetUnitsByFloorInput {
  buildingId: string
  floor: number
}

export class GetUnitsByFloorService {
  constructor(private readonly repository: UnitsRepository) {}

  async execute(input: IGetUnitsByFloorInput): Promise<TServiceResult<TUnit[]>> {
    const units = await this.repository.getByFloor(input.buildingId, input.floor)
    return success(units)
  }
}
