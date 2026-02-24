import { eq, and, or, ilike, sql, desc, type SQL } from 'drizzle-orm'
import type {
  TCondominiumService,
  TCondominiumServiceCreate,
  TCondominiumServiceUpdate,
  TPaginatedResponse,
  TCondominiumServicesQuerySchema,
} from '@packages/domain'
import { condominiumServices } from '@database/drizzle/schema'
import type { TDrizzleClient, IRepository } from './interfaces'
import { BaseRepository } from './base'

type TCondominiumServiceRecord = typeof condominiumServices.$inferSelect

export class CondominiumServicesRepository
  extends BaseRepository<typeof condominiumServices, TCondominiumService, TCondominiumServiceCreate, TCondominiumServiceUpdate>
  implements IRepository<TCondominiumService, TCondominiumServiceCreate, TCondominiumServiceUpdate>
{
  constructor(db: TDrizzleClient) {
    super(db, condominiumServices)
  }

  protected mapToEntity(record: unknown): TCondominiumService {
    const r = record as TCondominiumServiceRecord
    return {
      id: r.id,
      condominiumId: r.condominiumId,
      name: r.name,
      description: r.description,
      providerType: r.providerType as TCondominiumService['providerType'],
      legalName: r.legalName,
      taxIdType: r.taxIdType,
      taxIdNumber: r.taxIdNumber,
      email: r.email,
      phoneCountryCode: r.phoneCountryCode,
      phone: r.phone,
      address: r.address,
      locationId: r.locationId,
      currencyId: r.currencyId,
      defaultAmount: r.defaultAmount ? Number(r.defaultAmount) : null,
      isDefault: r.isDefault ?? false,
      isActive: r.isActive ?? true,
      metadata: r.metadata as Record<string, unknown> | null,
      createdBy: r.createdBy,
      createdAt: r.createdAt ?? new Date(),
      updatedAt: r.updatedAt ?? new Date(),
    }
  }

  protected mapToInsertValues(dto: TCondominiumServiceCreate): Record<string, unknown> {
    return {
      condominiumId: dto.condominiumId,
      name: dto.name,
      description: dto.description,
      providerType: dto.providerType,
      legalName: dto.legalName,
      taxIdType: dto.taxIdType,
      taxIdNumber: dto.taxIdNumber,
      email: dto.email,
      phoneCountryCode: dto.phoneCountryCode,
      phone: dto.phone,
      address: dto.address,
      locationId: dto.locationId,
      currencyId: dto.currencyId,
      defaultAmount: dto.defaultAmount != null ? String(dto.defaultAmount) : null,
    }
  }

  protected mapToUpdateValues(dto: TCondominiumServiceUpdate): Record<string, unknown> {
    const values: Record<string, unknown> = {}
    if (dto.name !== undefined) values.name = dto.name
    if (dto.description !== undefined) values.description = dto.description
    if (dto.providerType !== undefined) values.providerType = dto.providerType
    if (dto.legalName !== undefined) values.legalName = dto.legalName
    if (dto.taxIdType !== undefined) values.taxIdType = dto.taxIdType
    if (dto.taxIdNumber !== undefined) values.taxIdNumber = dto.taxIdNumber
    if (dto.email !== undefined) values.email = dto.email
    if (dto.phoneCountryCode !== undefined) values.phoneCountryCode = dto.phoneCountryCode
    if (dto.phone !== undefined) values.phone = dto.phone
    if (dto.address !== undefined) values.address = dto.address
    if (dto.locationId !== undefined) values.locationId = dto.locationId
    if (dto.currencyId !== undefined) values.currencyId = dto.currencyId
    if (dto.defaultAmount !== undefined) values.defaultAmount = dto.defaultAmount != null ? String(dto.defaultAmount) : null
    if (dto.isActive !== undefined) values.isActive = dto.isActive
    values.updatedAt = new Date()
    return values
  }

  /**
   * List services for a condominium with pagination and filters.
   */
  async listByCondominiumPaginated(
    condominiumId: string,
    query: TCondominiumServicesQuerySchema
  ): Promise<TPaginatedResponse<TCondominiumService>> {
    const { page = 1, limit = 20, search, providerType, isActive } = query
    const offset = (page - 1) * limit

    const conditions: SQL[] = [eq(condominiumServices.condominiumId, condominiumId)]

    if (isActive !== undefined) {
      conditions.push(eq(condominiumServices.isActive, isActive))
    }

    if (providerType) {
      conditions.push(eq(condominiumServices.providerType, providerType as TCondominiumService['providerType']))
    }

    if (search && search.trim()) {
      const searchTerm = `%${search.trim()}%`
      conditions.push(
        or(
          ilike(condominiumServices.name, searchTerm),
          ilike(condominiumServices.legalName, searchTerm),
          ilike(condominiumServices.taxIdNumber, searchTerm),
          ilike(condominiumServices.email, searchTerm)
        )!
      )
    }

    const whereClause = and(...conditions)

    const results = await this.db
      .select()
      .from(condominiumServices)
      .where(whereClause)
      .orderBy(desc(condominiumServices.createdAt))
      .limit(limit)
      .offset(offset)

    const countResult = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(condominiumServices)
      .where(whereClause)

    const total = countResult[0]?.count ?? 0
    const totalPages = Math.ceil(total / limit)

    return {
      data: results.map(record => this.mapToEntity(record)),
      pagination: { page, limit, total, totalPages },
    }
  }

  /**
   * Get all active services for a condominium.
   */
  async getByCondominiumId(condominiumId: string, includeInactive = false): Promise<TCondominiumService[]> {
    const conditions: SQL[] = [eq(condominiumServices.condominiumId, condominiumId)]
    if (!includeInactive) {
      conditions.push(eq(condominiumServices.isActive, true))
    }

    const results = await this.db
      .select()
      .from(condominiumServices)
      .where(and(...conditions))
      .orderBy(desc(condominiumServices.createdAt))

    return results.map(record => this.mapToEntity(record))
  }

  /**
   * Get default services for a condominium (gastos comunes, fondo de reserva).
   */
  async getDefaultsByCondominiumId(condominiumId: string): Promise<TCondominiumService[]> {
    const results = await this.db
      .select()
      .from(condominiumServices)
      .where(
        and(
          eq(condominiumServices.condominiumId, condominiumId),
          eq(condominiumServices.isDefault, true)
        )
      )

    return results.map(record => this.mapToEntity(record))
  }
}
