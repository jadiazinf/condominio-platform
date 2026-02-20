import type { TCondominiumAccessCode } from '@packages/domain'
import {
  CondominiumAccessCodesRepository,
  CondominiumsRepository,
  BuildingsRepository,
  UnitsRepository,
} from '@database/repositories'
import type { TDrizzleClient } from '@database/repositories/interfaces'
import { type TServiceResult, success, failure } from '../base.service'

export interface IValidateAccessCodeInput {
  code: string
}

export interface IValidateAccessCodeResult {
  accessCodeId: string
  condominium: {
    id: string
    name: string
    address: string | null
    email: string | null
    phone: string | null
  }
  buildings: Array<{
    id: string
    name: string
    units: Array<{
      id: string
      unitNumber: string
    }>
  }>
}

export class ValidateAccessCodeService {
  private readonly accessCodesRepository: CondominiumAccessCodesRepository
  private readonly condominiumsRepository: CondominiumsRepository
  private readonly buildingsRepository: BuildingsRepository
  private readonly unitsRepository: UnitsRepository

  constructor(db: TDrizzleClient) {
    this.accessCodesRepository = new CondominiumAccessCodesRepository(db)
    this.condominiumsRepository = new CondominiumsRepository(db)
    this.buildingsRepository = new BuildingsRepository(db)
    this.unitsRepository = new UnitsRepository(db)
  }

  async execute(input: IValidateAccessCodeInput): Promise<TServiceResult<IValidateAccessCodeResult>> {
    const accessCode = await this.accessCodesRepository.getByCode(input.code.toUpperCase())

    if (!accessCode) {
      return failure('Invalid access code', 'NOT_FOUND')
    }

    if (!accessCode.isActive) {
      return failure('Access code is inactive', 'BAD_REQUEST')
    }

    if (new Date(accessCode.expiresAt) <= new Date()) {
      return failure('Access code has expired', 'BAD_REQUEST')
    }

    // Fetch condominium
    const condominium = await this.condominiumsRepository.getById(accessCode.condominiumId)
    if (!condominium) {
      return failure('Condominium not found', 'NOT_FOUND')
    }

    // Fetch buildings with units
    const buildingsList = await this.buildingsRepository.getByCondominiumId(accessCode.condominiumId)

    const buildingsWithUnits = await Promise.all(
      buildingsList.map(async building => {
        const unitsList = await this.unitsRepository.getByBuildingId(building.id)
        return {
          id: building.id,
          name: building.name,
          units: unitsList.map(u => ({
            id: u.id,
            unitNumber: u.unitNumber,
          })),
        }
      })
    )

    return success({
      accessCodeId: accessCode.id,
      condominium: {
        id: condominium.id,
        name: condominium.name,
        address: condominium.address,
        email: condominium.email,
        phone: condominium.phone,
      },
      buildings: buildingsWithUnits,
    })
  }
}
