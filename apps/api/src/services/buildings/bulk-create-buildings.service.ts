import type { TBuilding, TBuildingCreate } from '@packages/domain'
import type { BuildingsRepository } from '@database/repositories'
import type { TDrizzleClient } from '@database/repositories/interfaces'
import { type TServiceResult, success } from '../base.service'

type TBulkCreateBuildingsInput = {
  condominiumId: string
  buildings: Omit<TBuildingCreate, 'condominiumId'>[]
}

export class BulkCreateBuildingsService {
  constructor(
    private readonly db: TDrizzleClient,
    private readonly buildingsRepository: BuildingsRepository
  ) {}

  async execute(input: TBulkCreateBuildingsInput): Promise<TServiceResult<TBuilding[]>> {
    return await this.db.transaction(async (tx) => {
      const txRepo = this.buildingsRepository.withTx(tx)
      const toCreate = input.buildings.map((b) => ({
        ...b,
        condominiumId: input.condominiumId,
      })) as TBuildingCreate[]
      const created = await txRepo.createBulk(toCreate)
      return success(created)
    })
  }
}
