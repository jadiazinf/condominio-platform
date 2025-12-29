import type { TBuilding } from '@packages/domain'
import type { BuildingsRepository } from '@database/repositories'
import { type TServiceResult, success } from '../base.service'

export interface IGetBuildingsByCondominiumInput {
  condominiumId: string
}

export class GetBuildingsByCondominiumService {
  constructor(private readonly repository: BuildingsRepository) {}

  async execute(input: IGetBuildingsByCondominiumInput): Promise<TServiceResult<TBuilding[]>> {
    const buildings = await this.repository.getByCondominiumId(input.condominiumId)
    return success(buildings)
  }
}
