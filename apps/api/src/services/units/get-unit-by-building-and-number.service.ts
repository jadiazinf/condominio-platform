import type { TUnit } from '@packages/domain'
import type { UnitsRepository } from '@database/repositories'
import { type TServiceResult, success, failure } from '../base.service'

export interface IGetUnitByBuildingAndNumberInput {
  buildingId: string
  unitNumber: string
}

export class GetUnitByBuildingAndNumberService {
  constructor(private readonly repository: UnitsRepository) {}

  async execute(input: IGetUnitByBuildingAndNumberInput): Promise<TServiceResult<TUnit>> {
    const unit = await this.repository.getByBuildingAndNumber(
      input.buildingId,
      input.unitNumber
    )

    if (!unit) {
      return failure('Unit not found', 'NOT_FOUND')
    }

    return success(unit)
  }
}
