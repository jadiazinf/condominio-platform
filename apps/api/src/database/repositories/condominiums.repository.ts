import { eq, and, or, ilike, sql, desc, inArray } from 'drizzle-orm'
import type {
  TCondominium,
  TCondominiumCreate,
  TCondominiumUpdate,
  TPaginatedResponse,
  TCondominiumsQuerySchema,
} from '@packages/domain'
import { condominiums, condominiumManagementCompanies } from '@database/drizzle/schema'
import type { TDrizzleClient, IRepository } from './interfaces'
import { BaseRepository } from './base'

type TCondominiumRecord = typeof condominiums.$inferSelect
type TCondominiumManagementCompanyRecord = typeof condominiumManagementCompanies.$inferSelect

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

  protected mapToEntity(record: unknown, managementCompanyIds: string[] = []): TCondominium {
    const r = record as TCondominiumRecord
    return {
      id: r.id,
      name: r.name,
      code: r.code,
      managementCompanyIds,
      address: r.address,
      locationId: r.locationId,
      email: r.email,
      phone: r.phone,
      phoneCountryCode: r.phoneCountryCode,
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
      // managementCompanyIds is handled separately via junction table
      address: dto.address,
      locationId: dto.locationId,
      email: dto.email,
      phone: dto.phone,
      phoneCountryCode: dto.phoneCountryCode,
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
    // managementCompanyIds is handled separately via junction table
    if (dto.address !== undefined) values.address = dto.address
    if (dto.locationId !== undefined) values.locationId = dto.locationId
    if (dto.email !== undefined) values.email = dto.email
    if (dto.phone !== undefined) values.phone = dto.phone
    if (dto.phoneCountryCode !== undefined) values.phoneCountryCode = dto.phoneCountryCode
    if (dto.defaultCurrencyId !== undefined) values.defaultCurrencyId = dto.defaultCurrencyId
    if (dto.isActive !== undefined) values.isActive = dto.isActive
    if (dto.metadata !== undefined) values.metadata = dto.metadata
    if (dto.createdBy !== undefined) values.createdBy = dto.createdBy

    return values
  }

  /**
   * Helper method to get management company IDs for a condominium.
   */
  private async getManagementCompanyIds(condominiumId: string): Promise<string[]> {
    const results = await this.db
      .select({ managementCompanyId: condominiumManagementCompanies.managementCompanyId })
      .from(condominiumManagementCompanies)
      .where(eq(condominiumManagementCompanies.condominiumId, condominiumId))

    return results.map(r => r.managementCompanyId)
  }

  /**
   * Helper method to get management company IDs for multiple condominiums.
   */
  private async getManagementCompanyIdsForCondominiums(
    condominiumIds: string[]
  ): Promise<Map<string, string[]>> {
    if (condominiumIds.length === 0) return new Map()

    const results = await this.db
      .select()
      .from(condominiumManagementCompanies)
      .where(inArray(condominiumManagementCompanies.condominiumId, condominiumIds))

    const map = new Map<string, string[]>()
    for (const r of results) {
      const existing = map.get(r.condominiumId) || []
      existing.push(r.managementCompanyId)
      map.set(r.condominiumId, existing)
    }

    return map
  }

  /**
   * Assigns management companies to a condominium.
   */
  async assignManagementCompanies(
    condominiumId: string,
    managementCompanyIds: string[],
    assignedBy?: string | null
  ): Promise<void> {
    if (managementCompanyIds.length === 0) return

    const values = managementCompanyIds.map(managementCompanyId => ({
      condominiumId,
      managementCompanyId,
      assignedBy: assignedBy ?? null,
    }))

    await this.db
      .insert(condominiumManagementCompanies)
      .values(values)
      .onConflictDoNothing()
  }

  /**
   * Removes management company assignments from a condominium.
   */
  async removeManagementCompanies(
    condominiumId: string,
    managementCompanyIds: string[]
  ): Promise<void> {
    if (managementCompanyIds.length === 0) return

    await this.db
      .delete(condominiumManagementCompanies)
      .where(
        and(
          eq(condominiumManagementCompanies.condominiumId, condominiumId),
          inArray(condominiumManagementCompanies.managementCompanyId, managementCompanyIds)
        )
      )
  }

  /**
   * Syncs management company assignments for a condominium (removes old, adds new).
   */
  async syncManagementCompanies(
    condominiumId: string,
    managementCompanyIds: string[],
    assignedBy?: string | null
  ): Promise<void> {
    // Get current assignments
    const currentIds = await this.getManagementCompanyIds(condominiumId)

    // Calculate what to add and remove
    const toAdd = managementCompanyIds.filter(id => !currentIds.includes(id))
    const toRemove = currentIds.filter(id => !managementCompanyIds.includes(id))

    // Perform operations
    await Promise.all([
      this.assignManagementCompanies(condominiumId, toAdd, assignedBy),
      this.removeManagementCompanies(condominiumId, toRemove),
    ])
  }

  /**
   * Override getById to include management company IDs.
   */
  override async getById(id: string, includeInactive = false): Promise<TCondominium | null> {
    const whereCondition = includeInactive
      ? eq(condominiums.id, id)
      : and(eq(condominiums.id, id), eq(condominiums.isActive, true))

    const results = await this.db.select().from(condominiums).where(whereCondition).limit(1)

    if (results.length === 0) {
      return null
    }

    const managementCompanyIds = await this.getManagementCompanyIds(id)
    return this.mapToEntity(results[0], managementCompanyIds)
  }

  /**
   * Override create to handle management company assignments.
   */
  override async create(dto: TCondominiumCreate): Promise<TCondominium> {
    const values = this.mapToInsertValues(dto)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Drizzle requires specific type for insert values
    const results = await this.db.insert(condominiums).values(values as any).returning()

    const record = results[0]
    if (!record) {
      throw new Error('Failed to create condominium')
    }

    const condominiumId = record.id

    // Assign management companies via junction table
    if (dto.managementCompanyIds && dto.managementCompanyIds.length > 0) {
      await this.assignManagementCompanies(condominiumId, dto.managementCompanyIds, dto.createdBy)
    }

    return this.mapToEntity(record, dto.managementCompanyIds)
  }

  /**
   * Override update to handle management company assignments.
   */
  override async update(id: string, dto: TCondominiumUpdate): Promise<TCondominium | null> {
    const values = this.mapToUpdateValues(dto)
    values.updatedAt = new Date()

    // Only update condominiums table if there are non-junction values
    const hasTableUpdates = Object.keys(values).length > 1 // More than just updatedAt
    let record: TCondominiumRecord | null = null

    if (hasTableUpdates) {
      const results = await this.db
        .update(condominiums)
        .set(values)
        .where(eq(condominiums.id, id))
        .returning()

      const updatedRecord = results[0]
      if (!updatedRecord) {
        return null
      }
      record = updatedRecord
    } else {
      // Just fetch the current record
      const results = await this.db.select().from(condominiums).where(eq(condominiums.id, id)).limit(1)
      const fetchedRecord = results[0]
      if (!fetchedRecord) {
        return null
      }
      record = fetchedRecord
    }

    // Sync management companies if provided
    if (dto.managementCompanyIds !== undefined) {
      await this.syncManagementCompanies(id, dto.managementCompanyIds)
    }

    const managementCompanyIds = await this.getManagementCompanyIds(id)
    return this.mapToEntity(record, managementCompanyIds)
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

    const record = results[0]
    if (!record) {
      return null
    }

    const managementCompanyIds = await this.getManagementCompanyIds(record.id)
    return this.mapToEntity(record, managementCompanyIds)
  }

  /**
   * Retrieves condominiums by management company using the junction table.
   */
  async getByManagementCompanyId(
    managementCompanyId: string,
    includeInactive = false
  ): Promise<TCondominium[]> {
    // Get condominium IDs that belong to this management company
    const junctionResults = await this.db
      .select({ condominiumId: condominiumManagementCompanies.condominiumId })
      .from(condominiumManagementCompanies)
      .where(eq(condominiumManagementCompanies.managementCompanyId, managementCompanyId))

    const condominiumIds = junctionResults.map(r => r.condominiumId)

    if (condominiumIds.length === 0) {
      return []
    }

    // Get the condominiums
    const results = await this.db
      .select()
      .from(condominiums)
      .where(inArray(condominiums.id, condominiumIds))

    // Get all management company mappings for these condominiums
    const managementCompanyMap = await this.getManagementCompanyIdsForCondominiums(condominiumIds)

    const mapped = results.map(record =>
      this.mapToEntity(record, managementCompanyMap.get(record.id) || [])
    )

    if (includeInactive) {
      return mapped
    }

    return mapped.filter(c => c.isActive)
  }

  /**
   * Retrieves condominiums by management company with pagination and filtering.
   */
  async listByManagementCompanyPaginated(
    managementCompanyId: string,
    query: TCondominiumsQuerySchema
  ): Promise<TPaginatedResponse<TCondominium>> {
    const { page = 1, limit = 20, search, isActive } = query
    const offset = (page - 1) * limit

    // Get condominium IDs that belong to this management company
    const junctionResults = await this.db
      .select({ condominiumId: condominiumManagementCompanies.condominiumId })
      .from(condominiumManagementCompanies)
      .where(eq(condominiumManagementCompanies.managementCompanyId, managementCompanyId))

    const condominiumIds = junctionResults.map(r => r.condominiumId)

    if (condominiumIds.length === 0) {
      return {
        data: [],
        pagination: { page, limit, total: 0, totalPages: 0 },
      }
    }

    // Build conditions array
    const conditions = [inArray(condominiums.id, condominiumIds)]

    // Filter by isActive if specified
    if (isActive !== undefined) {
      conditions.push(eq(condominiums.isActive, isActive))
    }

    // Search filter (name, code, email, address)
    if (search && search.trim()) {
      const searchTerm = `%${search.trim()}%`
      const searchCondition = or(
        ilike(condominiums.name, searchTerm),
        ilike(condominiums.code, searchTerm),
        ilike(condominiums.email, searchTerm),
        ilike(condominiums.address, searchTerm)
      )
      if (searchCondition) {
        conditions.push(searchCondition)
      }
    }

    // Build where clause - and() returns undefined if conditions is empty
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

    // Get management company IDs for all results
    const resultIds = results.map(r => r.id)
    const managementCompanyMap = await this.getManagementCompanyIdsForCondominiums(resultIds)

    return {
      data: results.map(record =>
        this.mapToEntity(record, managementCompanyMap.get(record.id) || [])
      ),
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    }
  }

  /**
   * Retrieves condominiums by location.
   */
  async getByLocationId(locationId: string, includeInactive = false): Promise<TCondominium[]> {
    const results = await this.db
      .select()
      .from(condominiums)
      .where(eq(condominiums.locationId, locationId))

    const condominiumIds = results.map(r => r.id)
    const managementCompanyMap = await this.getManagementCompanyIdsForCondominiums(condominiumIds)

    const mapped = results.map(record =>
      this.mapToEntity(record, managementCompanyMap.get(record.id) || [])
    )

    if (includeInactive) {
      return mapped
    }

    return mapped.filter(c => c.isActive)
  }

  /**
   * Retrieves condominiums with pagination, filtering, and ordering.
   */
  override async listPaginated(query: TCondominiumsQuerySchema): Promise<TPaginatedResponse<TCondominium>> {
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
      const searchCondition = or(
        ilike(condominiums.name, searchTerm),
        ilike(condominiums.code, searchTerm),
        ilike(condominiums.email, searchTerm),
        ilike(condominiums.address, searchTerm)
      )
      if (searchCondition) {
        conditions.push(searchCondition)
      }
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

    // Get management company IDs for all results
    const condominiumIds = results.map(r => r.id)
    const managementCompanyMap = await this.getManagementCompanyIdsForCondominiums(condominiumIds)

    return {
      data: results.map(record =>
        this.mapToEntity(record, managementCompanyMap.get(record.id) || [])
      ),
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    }
  }
}
