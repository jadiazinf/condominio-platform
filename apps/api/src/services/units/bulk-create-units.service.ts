import type { TUnit, TUnitCreate } from '@packages/domain'
import type { UnitsRepository } from '@database/repositories'
import type { TDrizzleClient } from '@database/repositories/interfaces'
import { type TServiceResult, success } from '../base.service'

type TBulkCreateUnitsInput = {
  units: TUnitCreate[]
}

export class BulkCreateUnitsService {
  constructor(
    private readonly db: TDrizzleClient,
    private readonly unitsRepository: UnitsRepository
  ) {}

  async execute(input: TBulkCreateUnitsInput): Promise<TServiceResult<TUnit[]>> {
    return await this.db.transaction(async (tx) => {
      const txRepo = this.unitsRepository.withTx(tx)
      const created = await txRepo.createBulk(input.units)
      return success(created)
    })
  }
}
