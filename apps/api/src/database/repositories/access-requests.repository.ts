import { and, eq, sql, desc, asc, or, ilike } from 'drizzle-orm'
import type { TAccessRequest, TPaginatedResponse } from '@packages/domain'
import { accessRequests, users, units, condominiums, buildings } from '@database/drizzle/schema'
import type { TDrizzleClient, IRepository } from './interfaces'
import { BaseRepository } from './base'

type TAccessRequestRecord = typeof accessRequests.$inferSelect

export type TAccessRequestInsert = {
  condominiumId: string
  unitId: string
  userId: string
  accessCodeId: string
  ownershipType: string
  status?: string
  adminNotes?: string | null
  reviewedBy?: string | null
  reviewedAt?: Date | null
}

export class AccessRequestsRepository
  extends BaseRepository<
    typeof accessRequests,
    TAccessRequest,
    TAccessRequestInsert,
    Partial<TAccessRequest>
  >
  implements IRepository<TAccessRequest, TAccessRequestInsert, Partial<TAccessRequest>>
{
  constructor(db: TDrizzleClient) {
    super(db, accessRequests)
  }

  protected mapToEntity(record: unknown): TAccessRequest {
    const r = record as TAccessRequestRecord
    return {
      id: r.id,
      condominiumId: r.condominiumId,
      unitId: r.unitId,
      userId: r.userId,
      accessCodeId: r.accessCodeId,
      ownershipType: r.ownershipType as TAccessRequest['ownershipType'],
      status: r.status as TAccessRequest['status'],
      adminNotes: r.adminNotes,
      reviewedBy: r.reviewedBy,
      reviewedAt: r.reviewedAt,
      createdAt: r.createdAt ?? new Date(),
      updatedAt: r.updatedAt ?? new Date(),
    }
  }

  protected mapToInsertValues(dto: TAccessRequestInsert): Record<string, unknown> {
    return {
      condominiumId: dto.condominiumId,
      unitId: dto.unitId,
      userId: dto.userId,
      accessCodeId: dto.accessCodeId,
      ownershipType: dto.ownershipType,
      status: dto.status ?? 'pending',
      adminNotes: dto.adminNotes,
      reviewedBy: dto.reviewedBy,
      reviewedAt: dto.reviewedAt,
    }
  }

  protected mapToUpdateValues(dto: Partial<TAccessRequest>): Record<string, unknown> {
    const values: Record<string, unknown> = {}

    if (dto.status !== undefined) values.status = dto.status
    if (dto.adminNotes !== undefined) values.adminNotes = dto.adminNotes
    if (dto.reviewedBy !== undefined) values.reviewedBy = dto.reviewedBy
    if (dto.reviewedAt !== undefined) values.reviewedAt = dto.reviewedAt

    return values
  }

  /**
   * List access requests for a condominium with user/unit/building info.
   */
  async listByCondominium(condominiumId: string, status?: string): Promise<TAccessRequest[]> {
    const conditions = [eq(accessRequests.condominiumId, condominiumId)]
    if (status) {
      conditions.push(eq(accessRequests.status, status as TAccessRequest['status']))
    }

    const results = await this.db
      .select({
        request: accessRequests,
        user: {
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          displayName: users.displayName,
          phoneCountryCode: users.phoneCountryCode,
          phoneNumber: users.phoneNumber,
          idDocumentType: users.idDocumentType,
          idDocumentNumber: users.idDocumentNumber,
        },
        unit: {
          id: units.id,
          unitNumber: units.unitNumber,
          buildingId: units.buildingId,
        },
        building: {
          id: buildings.id,
          name: buildings.name,
        },
      })
      .from(accessRequests)
      .leftJoin(users, eq(accessRequests.userId, users.id))
      .leftJoin(units, eq(accessRequests.unitId, units.id))
      .leftJoin(buildings, eq(units.buildingId, buildings.id))
      .where(and(...conditions))
      .orderBy(desc(accessRequests.createdAt))

    return results.map(row => ({
      ...this.mapToEntity(row.request),
      user: row.user ? {
        id: row.user.id,
        email: row.user.email,
        firstName: row.user.firstName,
        lastName: row.user.lastName,
        displayName: row.user.displayName,
        phoneCountryCode: row.user.phoneCountryCode,
        phoneNumber: row.user.phoneNumber,
        idDocumentType: row.user.idDocumentType,
        idDocumentNumber: row.user.idDocumentNumber,
      } : undefined,
      unit: row.unit ? {
        id: row.unit.id,
        unitNumber: row.unit.unitNumber,
        buildingId: row.unit.buildingId,
      } : undefined,
      building: row.building ? {
        id: row.building.id,
        name: row.building.name,
      } : undefined,
    })) as TAccessRequest[]
  }

  /**
   * List access requests for a condominium with pagination, filtering, and sorting.
   */
  async listByCondominiumPaginated(
    condominiumId: string,
    options: { page?: number; limit?: number; status?: string; search?: string }
  ): Promise<TPaginatedResponse<TAccessRequest>> {
    const page = options.page ?? 1
    const limit = options.limit ?? 20
    const offset = (page - 1) * limit

    const conditions = [eq(accessRequests.condominiumId, condominiumId)]
    if (options.status) {
      conditions.push(eq(accessRequests.status, options.status as TAccessRequest['status']))
    }

    // Build the base query with joins
    const baseQuery = this.db
      .select({
        request: accessRequests,
        user: {
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          displayName: users.displayName,
          phoneCountryCode: users.phoneCountryCode,
          phoneNumber: users.phoneNumber,
          idDocumentType: users.idDocumentType,
          idDocumentNumber: users.idDocumentNumber,
        },
        unit: {
          id: units.id,
          unitNumber: units.unitNumber,
          buildingId: units.buildingId,
        },
        building: {
          id: buildings.id,
          name: buildings.name,
        },
      })
      .from(accessRequests)
      .leftJoin(users, eq(accessRequests.userId, users.id))
      .leftJoin(units, eq(accessRequests.unitId, units.id))
      .leftJoin(buildings, eq(units.buildingId, buildings.id))

    // Add search conditions on user fields
    if (options.search) {
      const searchTerm = `%${options.search}%`
      conditions.push(
        or(
          ilike(users.firstName, searchTerm),
          ilike(users.lastName, searchTerm),
          ilike(users.displayName, searchTerm),
          ilike(users.email, searchTerm),
          ilike(users.idDocumentNumber, searchTerm)
        )!
      )
    }

    const whereClause = and(...conditions)

    // Count total
    const countResult = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(accessRequests)
      .leftJoin(users, eq(accessRequests.userId, users.id))
      .where(whereClause)

    const total = countResult[0]?.count ?? 0

    // Fetch paginated results (oldest first)
    const results = await baseQuery
      .where(whereClause)
      .orderBy(asc(accessRequests.createdAt))
      .limit(limit)
      .offset(offset)

    const data = results.map(row => ({
      ...this.mapToEntity(row.request),
      user: row.user ? {
        id: row.user.id,
        email: row.user.email,
        firstName: row.user.firstName,
        lastName: row.user.lastName,
        displayName: row.user.displayName,
        phoneCountryCode: row.user.phoneCountryCode,
        phoneNumber: row.user.phoneNumber,
        idDocumentType: row.user.idDocumentType,
        idDocumentNumber: row.user.idDocumentNumber,
      } : undefined,
      unit: row.unit ? {
        id: row.unit.id,
        unitNumber: row.unit.unitNumber,
        buildingId: row.unit.buildingId,
      } : undefined,
      building: row.building ? {
        id: row.building.id,
        name: row.building.name,
      } : undefined,
    })) as TAccessRequest[]

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }
  }

  /**
   * List access requests for a user with condominium/unit/building info.
   */
  async listByUser(userId: string): Promise<TAccessRequest[]> {
    const results = await this.db
      .select({
        request: accessRequests,
        condominium: {
          id: condominiums.id,
          name: condominiums.name,
        },
        unit: {
          id: units.id,
          unitNumber: units.unitNumber,
          buildingId: units.buildingId,
        },
        building: {
          id: buildings.id,
          name: buildings.name,
        },
      })
      .from(accessRequests)
      .leftJoin(condominiums, eq(accessRequests.condominiumId, condominiums.id))
      .leftJoin(units, eq(accessRequests.unitId, units.id))
      .leftJoin(buildings, eq(units.buildingId, buildings.id))
      .where(eq(accessRequests.userId, userId))
      .orderBy(desc(accessRequests.createdAt))

    return results.map(row => ({
      ...this.mapToEntity(row.request),
      condominium: row.condominium ? {
        id: row.condominium.id,
        name: row.condominium.name,
      } : undefined,
      unit: row.unit ? {
        id: row.unit.id,
        unitNumber: row.unit.unitNumber,
        buildingId: row.unit.buildingId,
      } : undefined,
      building: row.building ? {
        id: row.building.id,
        name: row.building.name,
      } : undefined,
    })) as TAccessRequest[]
  }

  /**
   * Get a single access request with user, condominium, unit, and building info.
   */
  async getByIdWithDetails(id: string): Promise<TAccessRequest | null> {
    const results = await this.db
      .select({
        request: accessRequests,
        user: {
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          displayName: users.displayName,
          phoneCountryCode: users.phoneCountryCode,
          phoneNumber: users.phoneNumber,
          idDocumentType: users.idDocumentType,
          idDocumentNumber: users.idDocumentNumber,
        },
        condominium: {
          id: condominiums.id,
          name: condominiums.name,
        },
        unit: {
          id: units.id,
          unitNumber: units.unitNumber,
          buildingId: units.buildingId,
        },
        building: {
          id: buildings.id,
          name: buildings.name,
        },
      })
      .from(accessRequests)
      .leftJoin(users, eq(accessRequests.userId, users.id))
      .leftJoin(condominiums, eq(accessRequests.condominiumId, condominiums.id))
      .leftJoin(units, eq(accessRequests.unitId, units.id))
      .leftJoin(buildings, eq(units.buildingId, buildings.id))
      .where(eq(accessRequests.id, id))
      .limit(1)

    if (results.length === 0) return null

    const row = results[0]!
    return {
      ...this.mapToEntity(row.request),
      user: row.user ? {
        id: row.user.id,
        email: row.user.email,
        firstName: row.user.firstName,
        lastName: row.user.lastName,
        displayName: row.user.displayName,
        phoneCountryCode: row.user.phoneCountryCode,
        phoneNumber: row.user.phoneNumber,
        idDocumentType: row.user.idDocumentType,
        idDocumentNumber: row.user.idDocumentNumber,
      } : undefined,
      condominium: row.condominium ? {
        id: row.condominium.id,
        name: row.condominium.name,
      } : undefined,
      unit: row.unit ? {
        id: row.unit.id,
        unitNumber: row.unit.unitNumber,
        buildingId: row.unit.buildingId,
      } : undefined,
      building: row.building ? {
        id: row.building.id,
        name: row.building.name,
      } : undefined,
    } as TAccessRequest
  }

  /**
   * List access requests for a user with pagination and status filter.
   */
  async listByUserPaginated(
    userId: string,
    options: { page?: number; limit?: number; status?: string }
  ): Promise<TPaginatedResponse<TAccessRequest>> {
    const page = options.page ?? 1
    const limit = options.limit ?? 20
    const offset = (page - 1) * limit

    const conditions = [eq(accessRequests.userId, userId)]
    if (options.status) {
      conditions.push(eq(accessRequests.status, options.status as TAccessRequest['status']))
    }

    const whereClause = and(...conditions)

    // Count total
    const countResult = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(accessRequests)
      .where(whereClause)

    const total = countResult[0]?.count ?? 0

    // Fetch paginated results (oldest first)
    const results = await this.db
      .select({
        request: accessRequests,
        condominium: {
          id: condominiums.id,
          name: condominiums.name,
        },
        unit: {
          id: units.id,
          unitNumber: units.unitNumber,
          buildingId: units.buildingId,
        },
        building: {
          id: buildings.id,
          name: buildings.name,
        },
      })
      .from(accessRequests)
      .leftJoin(condominiums, eq(accessRequests.condominiumId, condominiums.id))
      .leftJoin(units, eq(accessRequests.unitId, units.id))
      .leftJoin(buildings, eq(units.buildingId, buildings.id))
      .where(whereClause)
      .orderBy(asc(accessRequests.createdAt))
      .limit(limit)
      .offset(offset)

    const data = results.map(row => ({
      ...this.mapToEntity(row.request),
      condominium: row.condominium ? {
        id: row.condominium.id,
        name: row.condominium.name,
      } : undefined,
      unit: row.unit ? {
        id: row.unit.id,
        unitNumber: row.unit.unitNumber,
        buildingId: row.unit.buildingId,
      } : undefined,
      building: row.building ? {
        id: row.building.id,
        name: row.building.name,
      } : undefined,
    })) as TAccessRequest[]

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }
  }

  async getPendingByUserAndUnit(userId: string, unitId: string): Promise<TAccessRequest | null> {
    const results = await this.db
      .select()
      .from(accessRequests)
      .where(
        and(
          eq(accessRequests.userId, userId),
          eq(accessRequests.unitId, unitId),
          eq(accessRequests.status, 'pending')
        )
      )
      .limit(1)

    if (results.length === 0) return null
    return this.mapToEntity(results[0])
  }

  async countPending(condominiumId: string): Promise<number> {
    const result = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(accessRequests)
      .where(
        and(
          eq(accessRequests.condominiumId, condominiumId),
          eq(accessRequests.status, 'pending')
        )
      )

    return result[0]?.count ?? 0
  }
}
