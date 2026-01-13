import type { TBuilding } from '@packages/domain'
import type { BuildingsRepository } from '@database/repositories'
import { type TServiceResult, success, failure } from '../base.service'

export interface IGetBuildingByCondominiumAndCodeInput {
  condominiumId: string
  code: string
}

export class GetBuildingByCondominiumAndCodeService {
  constructor(private readonly repository: BuildingsRepository) {}

  async execute(input: IGetBuildingByCondominiumAndCodeInput): Promise<TServiceResult<TBuilding>> {
    const building = await this.repository.getByCondominiumAndCode(input.condominiumId, input.code)

    if (!building) {
      return failure('Building not found', 'NOT_FOUND')
    }

    return success(building)
  }
}
