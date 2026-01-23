import { eq, and, or, ilike, sql, desc } from 'drizzle-orm'
import type {
  TManagementCompany,
  TManagementCompanyCreate,
  TManagementCompanyUpdate,
  TPaginatedResponse,
  TManagementCompaniesQuerySchema,
} from '@packages/domain'
import { managementCompanies } from '@database/drizzle/schema'
import type { TDrizzleClient, IRepository } from './interfaces'
import { BaseRepository } from './base'

type TManagementCompanyRecord = typeof managementCompanies.$inferSelect

/**
 * Repository for managing management company entities.
 * Implements soft delete pattern via isActive flag.
 */
export class ManagementCompaniesRepository
  extends BaseRepository<
    typeof managementCompanies,
    TManagementCompany,
    TManagementCompanyCreate,
    TManagementCompanyUpdate
  >
  implements IRepository<TManagementCompany, TManagementCompanyCreate, TManagementCompanyUpdate>
{
  constructor(db: TDrizzleClient) {
    super(db, managementCompanies)
  }

  protected mapToEntity(record: unknown): TManagementCompany {
    const r = record as TManagementCompanyRecord
    return {
      id: r.id,
      name: r.name,
      legalName: r.legalName,
      taxId: r.taxId,
      email: r.email,
      phone: r.phone,
      website: r.website,
      address: r.address,
      locationId: r.locationId,
      isActive: r.isActive ?? true,
      logoUrl: r.logoUrl,
      metadata: r.metadata as Record<string, unknown> | null,
      createdBy: r.createdBy,
      createdAt: r.createdAt ?? new Date(),
      updatedAt: r.updatedAt ?? new Date(),
    }
  }

  protected mapToInsertValues(dto: TManagementCompanyCreate): Record<string, unknown> {
    return {
      name: dto.name,
      legalName: dto.legalName,
      taxId: dto.taxId,
      email: dto.email,
      phone: dto.phone,
      website: dto.website,
      address: dto.address,
      locationId: dto.locationId,
      isActive: dto.isActive,
      logoUrl: dto.logoUrl,
      metadata: dto.metadata,
      createdBy: dto.createdBy,
    }
  }

  protected mapToUpdateValues(dto: TManagementCompanyUpdate): Record<string, unknown> {
    const values: Record<string, unknown> = {}

    if (dto.name !== undefined) values.name = dto.name
    if (dto.legalName !== undefined) values.legalName = dto.legalName
    if (dto.taxId !== undefined) values.taxId = dto.taxId
    if (dto.email !== undefined) values.email = dto.email
    if (dto.phone !== undefined) values.phone = dto.phone
    if (dto.website !== undefined) values.website = dto.website
    if (dto.address !== undefined) values.address = dto.address
    if (dto.locationId !== undefined) values.locationId = dto.locationId
    if (dto.isActive !== undefined) values.isActive = dto.isActive
    if (dto.logoUrl !== undefined) values.logoUrl = dto.logoUrl
    if (dto.metadata !== undefined) values.metadata = dto.metadata
    if (dto.createdBy !== undefined) values.createdBy = dto.createdBy

    return values
  }

  /**
   * Retrieves a management company by tax ID.
   */
  async getByTaxId(taxId: string): Promise<TManagementCompany | null> {
    const results = await this.db
      .select()
      .from(managementCompanies)
      .where(eq(managementCompanies.taxId, taxId))
      .limit(1)

    if (results.length === 0) {
      return null
    }

    return this.mapToEntity(results[0])
  }

  /**
   * Retrieves management companies by location.
   */
  async getByLocationId(locationId: string): Promise<TManagementCompany[]> {
    const results = await this.db
      .select()
      .from(managementCompanies)
      .where(eq(managementCompanies.locationId, locationId))

    return results.map(record => this.mapToEntity(record))
  }

  /**
   * Retrieves management companies with pagination, filtering, and ordering.
   */
  async listPaginated(
    query: TManagementCompaniesQuerySchema
  ): Promise<TPaginatedResponse<TManagementCompany>> {
    const { page = 1, limit = 20, search, isActive = true } = query
    const offset = (page - 1) * limit

    // Build conditions array
    const conditions = []

    // Filter by isActive (default to true)
    if (isActive !== undefined) {
      conditions.push(eq(managementCompanies.isActive, isActive))
    }

    // Search filter (name, email, taxId)
    if (search && search.trim()) {
      const searchTerm = `%${search.trim()}%`
      conditions.push(
        or(
          ilike(managementCompanies.name, searchTerm),
          ilike(managementCompanies.email, searchTerm),
          ilike(managementCompanies.taxId, searchTerm)
        )
      )
    }

    // Build where clause
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined

    // Get paginated data ordered by createdAt DESC
    const results = await this.db
      .select()
      .from(managementCompanies)
      .where(whereClause)
      .orderBy(desc(managementCompanies.createdAt))
      .limit(limit)
      .offset(offset)

    // Get total count
    const countResult = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(managementCompanies)
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

  /**
   * Toggles the isActive status of a management company.
   */
  async toggleActive(id: string, isActive: boolean): Promise<TManagementCompany | null> {
    const results = await this.db
      .update(managementCompanies)
      .set({ isActive, updatedAt: new Date() })
      .where(eq(managementCompanies.id, id))
      .returning()

    if (results.length === 0) {
      return null
    }

    return this.mapToEntity(results[0])
  }
}
