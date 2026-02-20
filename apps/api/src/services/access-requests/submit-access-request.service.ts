import type { TAccessRequest, TOwnershipType, TPaginatedResponse } from '@packages/domain'
import {
  CondominiumAccessCodesRepository,
  AccessRequestsRepository,
  UnitOwnershipsRepository,
  UnitsRepository,
  BuildingsRepository,
} from '@database/repositories'
import type { TDrizzleClient } from '@database/repositories/interfaces'
import { type TServiceResult, success, failure } from '../base.service'

export interface ISubmitAccessRequestInput {
  userId: string
  accessCodeId: string
  unitId: string
  ownershipType: TOwnershipType
}

export class SubmitAccessRequestService {
  private readonly accessCodesRepository: CondominiumAccessCodesRepository
  private readonly accessRequestsRepository: AccessRequestsRepository
  private readonly unitOwnershipsRepository: UnitOwnershipsRepository
  private readonly unitsRepository: UnitsRepository
  private readonly buildingsRepository: BuildingsRepository

  constructor(private readonly db: TDrizzleClient) {
    this.accessCodesRepository = new CondominiumAccessCodesRepository(db)
    this.accessRequestsRepository = new AccessRequestsRepository(db)
    this.unitOwnershipsRepository = new UnitOwnershipsRepository(db)
    this.unitsRepository = new UnitsRepository(db)
    this.buildingsRepository = new BuildingsRepository(db)
  }

  async execute(input: ISubmitAccessRequestInput): Promise<TServiceResult<TAccessRequest>> {
    const { userId, accessCodeId, unitId, ownershipType } = input

    // 1. Validate access code
    const accessCode = await this.accessCodesRepository.getById(accessCodeId)
    if (!accessCode) {
      return failure('Invalid access code', 'NOT_FOUND')
    }

    if (!accessCode.isActive) {
      return failure('Access code is inactive', 'BAD_REQUEST')
    }

    if (new Date(accessCode.expiresAt) <= new Date()) {
      return failure('Access code has expired', 'BAD_REQUEST')
    }

    const condominiumId = accessCode.condominiumId

    // 2. Validate unit belongs to the condominium
    const unit = await this.unitsRepository.getById(unitId)
    if (!unit) {
      return failure('Unit not found', 'NOT_FOUND')
    }

    const building = await this.buildingsRepository.getById(unit.buildingId)
    if (!building || building.condominiumId !== condominiumId) {
      return failure('Unit does not belong to this condominium', 'BAD_REQUEST')
    }

    // 3. Check no active ownership for this user+unit
    const existingOwnership = await this.unitOwnershipsRepository.getByUnitAndUser(unitId, userId)
    if (existingOwnership && existingOwnership.isActive) {
      return failure('You already have an active ownership for this unit', 'CONFLICT')
    }

    // 4. Check no pending request for this user+unit
    const existingRequest = await this.accessRequestsRepository.getPendingByUserAndUnit(userId, unitId)
    if (existingRequest) {
      return failure('You already have a pending request for this unit', 'CONFLICT')
    }

    // 5. Create the request
    const request = await this.accessRequestsRepository.create({
      condominiumId,
      unitId,
      userId,
      accessCodeId,
      ownershipType,
      status: 'pending',
    })

    return success(request)
  }

  async listByUser(userId: string): Promise<TAccessRequest[]> {
    return this.accessRequestsRepository.listByUser(userId)
  }

  async listByUserPaginated(
    userId: string,
    options: { page?: number; limit?: number; status?: string }
  ): Promise<TPaginatedResponse<TAccessRequest>> {
    return this.accessRequestsRepository.listByUserPaginated(userId, options)
  }
}
