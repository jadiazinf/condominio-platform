import type { TCondominium, TCondominiumCreate, TBuildingCreate, TUnitCreate } from '@packages/domain'
import type { CondominiumsRepository, BuildingsRepository, UnitsRepository } from '@database/repositories'
import type { TDrizzleClient } from '@database/repositories/interfaces'
import { type TServiceResult, success } from '../base.service'

/**
 * Input for the wizard: condominium data + buildings (each with nested units).
 */
export type TWizardBuilding = Omit<TBuildingCreate, 'condominiumId'> & {
  units: Omit<TUnitCreate, 'buildingId'>[]
}

export type TCreateCondominiumWizardInput = {
  condominium: TCondominiumCreate
  buildings: TWizardBuilding[]
}

export type TCreateCondominiumWizardOutput = {
  condominium: TCondominium
  buildingsCreated: number
  unitsCreated: number
}

/**
 * Creates a condominium with all its buildings and units in a single transaction.
 * If any step fails, the entire operation is rolled back.
 */
export class CreateCondominiumWizardService {
  constructor(
    private readonly db: TDrizzleClient,
    private readonly condominiumsRepository: CondominiumsRepository,
    private readonly buildingsRepository: BuildingsRepository,
    private readonly unitsRepository: UnitsRepository
  ) {}

  async execute(
    input: TCreateCondominiumWizardInput
  ): Promise<TServiceResult<TCreateCondominiumWizardOutput>> {
    return await this.db.transaction(async (tx) => {
      const txCondominiums = this.condominiumsRepository.withTx(tx)
      const txBuildings = this.buildingsRepository.withTx(tx)
      const txUnits = this.unitsRepository.withTx(tx)

      // 1. Create condominium
      const condominium = await txCondominiums.create(input.condominium)

      // 2. Create buildings (if any)
      let buildingsCreated = 0
      let unitsCreated = 0

      if (input.buildings.length > 0) {
        const buildingData: TBuildingCreate[] = input.buildings.map(({ units, ...b }) => ({
          ...b,
          condominiumId: condominium.id,
          unitsCount: units.length || undefined,
        }))

        const createdBuildings = await txBuildings.createBulk(buildingData)
        buildingsCreated = createdBuildings.length

        // 3. Create units for each building
        const allUnits: TUnitCreate[] = []

        for (let i = 0; i < input.buildings.length; i++) {
          const wizardBuilding = input.buildings[i]
          const realBuilding = createdBuildings[i]
          if (!realBuilding || !wizardBuilding || !wizardBuilding.units.length) continue

          for (const unit of wizardBuilding.units) {
            allUnits.push({
              ...unit,
              buildingId: realBuilding.id,
            })
          }
        }

        if (allUnits.length > 0) {
          const createdUnits = await txUnits.createBulk(allUnits)
          unitsCreated = createdUnits.length
        }
      }

      return success({
        condominium,
        buildingsCreated,
        unitsCreated,
      })
    })
  }
}
