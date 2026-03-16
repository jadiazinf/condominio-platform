import { and, eq, gt } from 'drizzle-orm'
import type { TCondominiumAccessCode } from '@packages/domain'
import { condominiumAccessCodes } from '../drizzle/schema'
import type { TDrizzleClient, IRepository } from './interfaces'
import { BaseRepository } from './base'

type TCondominiumAccessCodeRecord = typeof condominiumAccessCodes.$inferSelect

/**
 * Insert DTO for the repository layer.
 * The service computes `code` and `expiresAt` from the domain-level `validity` field.
 */
export type TCondominiumAccessCodeInsert = {
  condominiumId: string
  code: string
  expiresAt: Date
  isActive?: boolean
  createdBy: string | null
}

export class CondominiumAccessCodesRepository
  extends BaseRepository<
    typeof condominiumAccessCodes,
    TCondominiumAccessCode,
    TCondominiumAccessCodeInsert,
    Partial<TCondominiumAccessCode>
  >
  implements
    IRepository<
      TCondominiumAccessCode,
      TCondominiumAccessCodeInsert,
      Partial<TCondominiumAccessCode>
    >
{
  constructor(db: TDrizzleClient) {
    super(db, condominiumAccessCodes)
  }

  protected mapToEntity(record: unknown): TCondominiumAccessCode {
    const r = record as TCondominiumAccessCodeRecord
    return {
      id: r.id,
      condominiumId: r.condominiumId,
      code: r.code,
      expiresAt: r.expiresAt,
      isActive: r.isActive ?? true,
      createdBy: r.createdBy,
      createdAt: r.createdAt ?? new Date(),
      updatedAt: r.updatedAt ?? new Date(),
    }
  }

  async getActiveByCondominiumId(condominiumId: string): Promise<TCondominiumAccessCode | null> {
    const results = await this.db
      .select()
      .from(condominiumAccessCodes)
      .where(
        and(
          eq(condominiumAccessCodes.condominiumId, condominiumId),
          eq(condominiumAccessCodes.isActive, true),
          gt(condominiumAccessCodes.expiresAt, new Date())
        )
      )
      .limit(1)

    if (results.length === 0) return null
    return this.mapToEntity(results[0])
  }

  async getByCode(code: string): Promise<TCondominiumAccessCode | null> {
    const results = await this.db
      .select()
      .from(condominiumAccessCodes)
      .where(eq(condominiumAccessCodes.code, code))
      .limit(1)

    if (results.length === 0) return null
    return this.mapToEntity(results[0])
  }

  async deactivateAllForCondominium(condominiumId: string): Promise<void> {
    await this.db
      .update(condominiumAccessCodes)
      .set({ isActive: false, updatedAt: new Date() })
      .where(
        and(
          eq(condominiumAccessCodes.condominiumId, condominiumId),
          eq(condominiumAccessCodes.isActive, true)
        )
      )
  }
}
