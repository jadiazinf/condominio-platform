import type { TAccessRequest, TAccessRequestStatus, TOwnershipType } from '@packages/domain'
import { ESystemRole } from '@packages/domain'
import { and, eq } from 'drizzle-orm'
import {
  AccessRequestsRepository,
  UnitOwnershipsRepository,
  UserRolesRepository,
  RolesRepository,
  UnitsRepository,
} from '@database/repositories'
import { condominiumManagementCompanies } from '@database/drizzle/schema'
import type { TDrizzleClient } from '@database/repositories/interfaces'
import { type TServiceResult, success, failure } from '../base.service'

export interface IReviewAccessRequestInput {
  accessRequestId: string
  status: 'approved' | 'rejected'
  adminNotes?: string
  reviewedBy: string
  condominiumId?: string
  managementCompanyId?: string
}

export interface IReviewAccessRequestResult {
  request: TAccessRequest
}

export class ReviewAccessRequestService {
  private readonly unitOwnershipsRepository: UnitOwnershipsRepository
  private readonly userRolesRepository: UserRolesRepository
  private readonly rolesRepository: RolesRepository
  private readonly unitsRepository: UnitsRepository

  constructor(
    private readonly db: TDrizzleClient,
    private readonly accessRequestsRepository: AccessRequestsRepository
  ) {
    this.unitOwnershipsRepository = new UnitOwnershipsRepository(db)
    this.userRolesRepository = new UserRolesRepository(db)
    this.rolesRepository = new RolesRepository(db)
    this.unitsRepository = new UnitsRepository(db)
  }

  async execute(input: IReviewAccessRequestInput): Promise<TServiceResult<IReviewAccessRequestResult>> {
    const { accessRequestId, status, adminNotes, reviewedBy, condominiumId, managementCompanyId } = input

    // 1. Fetch the request
    const request = await this.accessRequestsRepository.getById(accessRequestId)
    if (!request) {
      return failure('Access request not found', 'NOT_FOUND')
    }

    if (request.status !== 'pending') {
      return failure('Access request has already been reviewed', 'BAD_REQUEST')
    }

    // 2. Verify authorization
    const isCondominiumAdmin = condominiumId && request.condominiumId === condominiumId
    let isMcAdmin = false

    if (!isCondominiumAdmin && managementCompanyId) {
      // MC admin — verify the request's condominium is managed by this MC
      const [mcLink] = await this.db
        .select({ id: condominiumManagementCompanies.id })
        .from(condominiumManagementCompanies)
        .where(
          and(
            eq(condominiumManagementCompanies.condominiumId, request.condominiumId),
            eq(condominiumManagementCompanies.managementCompanyId, managementCompanyId)
          )
        )
        .limit(1)

      isMcAdmin = !!mcLink
    }

    if (!isCondominiumAdmin && !isMcAdmin) {
      return failure('Access request does not belong to this condominium', 'BAD_REQUEST')
    }

    // Use the request's own condominiumId for role creation (works for both admin types)
    const effectiveCondominiumId = request.condominiumId

    // 3. If rejected, just update
    if (status === 'rejected') {
      const updated = await this.accessRequestsRepository.update(accessRequestId, {
        status: 'rejected' as TAccessRequestStatus,
        adminNotes: adminNotes ?? null,
        reviewedBy,
        reviewedAt: new Date(),
      })

      return success({ request: updated ?? request })
    }

    // 4. If approved, create ownership + role in transaction
    return await this.db.transaction(async tx => {
      const txRequestsRepo = this.accessRequestsRepository.withTx(tx)
      const txOwnershipsRepo = this.unitOwnershipsRepository.withTx(tx)
      const txUserRolesRepo = this.userRolesRepository.withTx(tx)

      // Update request status
      const updated = await txRequestsRepo.update(accessRequestId, {
        status: 'approved' as TAccessRequestStatus,
        adminNotes: adminNotes ?? null,
        reviewedBy,
        reviewedAt: new Date(),
      })

      // Create unit ownership
      await txOwnershipsRepo.create({
        unitId: request.unitId,
        userId: request.userId,
        fullName: null,
        email: null,
        phone: null,
        phoneCountryCode: null,
        idDocumentType: null,
        idDocumentNumber: null,
        isRegistered: true,
        ownershipType: request.ownershipType as TOwnershipType,
        ownershipPercentage: null,
        titleDeedNumber: null,
        titleDeedDate: null,
        startDate: new Date().toISOString().split('T')[0]!,
        endDate: null,
        isActive: true,
        isPrimaryResidence: false,
        metadata: null,
      })

      // Create or activate user role for the condominium
      const userRole = await this.rolesRepository.getByName(ESystemRole.USER)
      if (userRole) {
        const existingRoles = await txUserRolesRepo.getByUserAndCondominium(
          request.userId,
          effectiveCondominiumId
        )
        const hasActiveRole = existingRoles.some(r => r.isActive)

        if (!hasActiveRole) {
          const existingInactiveRole = existingRoles.find(r => !r.isActive)
          if (existingInactiveRole) {
            await txUserRolesRepo.update(existingInactiveRole.id, { isActive: true })
          } else {
            await txUserRolesRepo.create({
              userId: request.userId,
              roleId: userRole.id,
              condominiumId: effectiveCondominiumId,
              buildingId: null,
              managementCompanyId: null,
              isActive: true,
              notes: 'Created via access request approval',
              assignedBy: reviewedBy,
              registeredBy: reviewedBy,
              expiresAt: null,
            })
          }
        }
      }

      return success({ request: updated ?? request })
    })
  }
}
