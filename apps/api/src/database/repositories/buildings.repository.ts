import { and, eq } from 'drizzle-orm'
import type { TBuilding, TBuildingCreate, TBuildingUpdate } from '@packages/domain'
import { buildings } from '@database/drizzle/schema'
import type { TDrizzleClient, IRepository } from './interfaces'
import { BaseRepository } from './base'

type TBuildingRecord = typeof buildings.$inferSelect

/**
 * Repository for managing building entities.
 * Implements soft delete pattern via isActive flag.
 */
export class BuildingsRepository
  extends BaseRepository<typeof buildings, TBuilding, TBuildingCreate, TBuildingUpdate>
  implements IRepository<TBuilding, TBuildingCreate, TBuildingUpdate>
{
  constructor(db: TDrizzleClient) {
    super(db, buildings)
  }

  protected mapToEntity(record: unknown): TBuilding {
    const r = record as TBuildingRecord
    return {
      id: r.id,
      condominiumId: r.condominiumId,
      name: r.name,
      code: r.code,
      address: r.address,
      floorsCount: r.floorsCount,
      unitsCount: r.unitsCount,
      bankAccountHolder: r.bankAccountHolder,
      bankName: r.bankName,
      bankAccountNumber: r.bankAccountNumber,
      bankAccountType: r.bankAccountType as TBuilding['bankAccountType'],
      isActive: r.isActive ?? true,
      metadata: r.metadata as Record<string, unknown> | null,
      createdBy: r.createdBy,
      createdAt: r.createdAt ?? new Date(),
      updatedAt: r.updatedAt ?? new Date(),
    }
  }

  protected mapToInsertValues(dto: TBuildingCreate): Record<string, unknown> {
    return {
      condominiumId: dto.condominiumId,
      name: dto.name,
      code: dto.code,
      address: dto.address,
      floorsCount: dto.floorsCount,
      unitsCount: dto.unitsCount,
      bankAccountHolder: dto.bankAccountHolder,
      bankName: dto.bankName,
      bankAccountNumber: dto.bankAccountNumber,
      bankAccountType: dto.bankAccountType,
      isActive: dto.isActive,
      metadata: dto.metadata,
      createdBy: dto.createdBy,
    }
  }

  protected mapToUpdateValues(dto: TBuildingUpdate): Record<string, unknown> {
    const values: Record<string, unknown> = {}

    if (dto.condominiumId !== undefined) values.condominiumId = dto.condominiumId
    if (dto.name !== undefined) values.name = dto.name
    if (dto.code !== undefined) values.code = dto.code
    if (dto.address !== undefined) values.address = dto.address
    if (dto.floorsCount !== undefined) values.floorsCount = dto.floorsCount
    if (dto.unitsCount !== undefined) values.unitsCount = dto.unitsCount
    if (dto.bankAccountHolder !== undefined) values.bankAccountHolder = dto.bankAccountHolder
    if (dto.bankName !== undefined) values.bankName = dto.bankName
    if (dto.bankAccountNumber !== undefined) values.bankAccountNumber = dto.bankAccountNumber
    if (dto.bankAccountType !== undefined) values.bankAccountType = dto.bankAccountType
    if (dto.isActive !== undefined) values.isActive = dto.isActive
    if (dto.metadata !== undefined) values.metadata = dto.metadata
    if (dto.createdBy !== undefined) values.createdBy = dto.createdBy

    return values
  }

  /**
   * Retrieves buildings by condominium.
   */
  async getByCondominiumId(condominiumId: string, includeInactive = false): Promise<TBuilding[]> {
    const results = await this.db
      .select()
      .from(buildings)
      .where(eq(buildings.condominiumId, condominiumId))

    const mapped = results.map(record => this.mapToEntity(record))

    if (includeInactive) {
      return mapped
    }

    return mapped.filter(b => b.isActive)
  }

  /**
   * Retrieves a building by condominium and code.
   */
  async getByCondominiumAndCode(condominiumId: string, code: string): Promise<TBuilding | null> {
    const results = await this.db
      .select()
      .from(buildings)
      .where(and(eq(buildings.condominiumId, condominiumId), eq(buildings.code, code)))
      .limit(1)

    if (results.length === 0) {
      return null
    }

    return this.mapToEntity(results[0])
  }
}
