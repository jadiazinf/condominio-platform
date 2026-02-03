import { eq, and, or, ilike, sql, desc } from 'drizzle-orm'
import type {
  TCondominium,
  TCondominiumCreate,
  TCondominiumUpdate,
  TPaginatedResponse,
  TCondominiumsQuerySchema,
} from '@packages/domain'
import { condominiums } from '@database/drizzle/schema'
import type { TDrizzleClient, IRepository } from './interfaces'
import { BaseRepository } from './base'

type TCondominiumRecord = typeof condominiums.$inferSelect

/**
 * Repository for managing condominium entities.
 * Implements soft delete pattern via isActive flag.
 */
export class CondominiumsRepository
  extends BaseRepository<typeof condominiums, TCondominium, TCondominiumCreate, TCondominiumUpdate>
  implements IRepository<TCondominium, TCondominiumCreate, TCondominiumUpdate>
{
  constructor(db: TDrizzleClient) {
    super(db, condominiums)
  }

  protected mapToEntity(record: unknown): TCondominium {
    const r = record as TCondominiumRecord
    return {
      id: r.id,
      name: r.name,
      code: r.code,
      managementCompanyId: r.managementCompanyId,
      address: r.address,
      locationId: r.locationId,
      email: r.email,
      phone: r.phone,
      defaultCurrencyId: r.defaultCurrencyId,
      isActive: r.isActive ?? true,
      metadata: r.metadata as Record<string, unknown> | null,
      createdBy: r.createdBy,
      createdAt: r.createdAt ?? new Date(),
      updatedAt: r.updatedAt ?? new Date(),
    }
  }

  protected mapToInsertValues(dto: TCondominiumCreate): Record<string, unknown> {
    return {
      name: dto.name,
      code: dto.code,
      managementCompanyId: dto.managementCompanyId,
      address: dto.address,
      locationId: dto.locationId,
      email: dto.email,
      phone: dto.phone,
      defaultCurrencyId: dto.defaultCurrencyId,
      isActive: dto.isActive,
      metadata: dto.metadata,
      createdBy: dto.createdBy,
    }
  }

  protected mapToUpdateValues(dto: TCondominiumUpdate): Record<string, unknown> {
    const values: Record<string, unknown> = {}

    if (dto.name !== undefined) values.name = dto.name
    if (dto.code !== undefined) values.code = dto.code
    if (dto.managementCompanyId !== undefined) values.managementCompanyId = dto.managementCompanyId
    if (dto.address !== undefined) values.address = dto.address
    if (dto.locationId !== undefined) values.locationId = dto.locationId
    if (dto.email !== undefined) values.email = dto.email
    if (dto.phone !== undefined) values.phone = dto.phone
    if (dto.defaultCurrencyId !== undefined) values.defaultCurrencyId = dto.defaultCurrencyId
    if (dto.isActive !== undefined) values.isActive = dto.isActive
    if (dto.metadata !== undefined) values.metadata = dto.metadata
    if (dto.createdBy !== undefined) values.createdBy = dto.createdBy

    return values
  }

  /**
   * Retrieves a condominium by code.
   */
  async getByCode(code: string): Promise<TCondominium | null> {
    const results = await this.db
      .select()
      .from(condominiums)
      .where(eq(condominiums.code, code))
      .limit(1)

    if (results.length === 0) {
      return null
    }

    return this.mapToEntity(results[0])
  }

  /**
   * Retrieves condominiums by management company.
   */
  async getByManagementCompanyId(
    managementCompanyId: string,
    includeInactive = false
  ): Promise<TCondominium[]> {
    const results = await this.db
      .select()
      .from(condominiums)
      .where(eq(condominiums.managementCompanyId, managementCompanyId))

    const mapped = results.map(record => this.mapToEntity(record))

    if (includeInactive) {
      return mapped
    }

    return mapped.filter(c => c.isActive)
  }

  /**
   * Retrieves condominiums by location.
   */
  async getByLocationId(locationId: string, includeInactive = false): Promise<TCondominium[]> {
    const results = await this.db
      .select()
      .from(condominiums)
      .where(eq(condominiums.locationId, locationId))

    const mapped = results.map(record => this.mapToEntity(record))

    if (includeInactive) {
      return mapped
    }

    return mapped.filter(c => c.isActive)
  }

  /**
   * Retrieves condominiums with pagination, filtering, and ordering.
   */
  async listPaginated(query: TCondominiumsQuerySchema): Promise<TPaginatedResponse<TCondominium>> {
    const { page = 1, limit = 20, search, isActive, locationId } = query
    const offset = (page - 1) * limit

    // Build conditions array
    const conditions = []

    // Filter by isActive if specified
    if (isActive !== undefined) {
      conditions.push(eq(condominiums.isActive, isActive))
    }

    // Filter by locationId if specified
    if (locationId) {
      conditions.push(eq(condominiums.locationId, locationId))
    }

    // Search filter (name, code, email, address)
    if (search && search.trim()) {
      const searchTerm = `%${search.trim()}%`
      conditions.push(
        or(
          ilike(condominiums.name, searchTerm),
          ilike(condominiums.code, searchTerm),
          ilike(condominiums.email, searchTerm),
          ilike(condominiums.address, searchTerm)
        )
      )
    }

    // Build where clause
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined

    // Get paginated data ordered by createdAt DESC
    const results = await this.db
      .select()
      .from(condominiums)
      .where(whereClause)
      .orderBy(desc(condominiums.createdAt))
      .limit(limit)
      .offset(offset)

    // Get total count
    const countResult = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(condominiums)
      .where(whereClause)

    const total = countResult[0]?.count ?? 0
    const totalPages = Math.ceil(total / limit)

    return {
      data: results.map(record => this.mapToEntity(record)),
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    }
  }
}
