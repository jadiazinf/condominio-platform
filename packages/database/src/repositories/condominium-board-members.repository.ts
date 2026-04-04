import { eq, and, desc } from 'drizzle-orm'
import type {
  TCondominiumBoardMember,
  TCondominiumBoardMemberCreate,
  TCondominiumBoardMemberUpdate,
} from '@packages/domain'
import { condominiumBoardMembers } from '../drizzle/schema'
import type { TDrizzleClient } from './interfaces'
import { BaseRepository } from './base'

type TCondominiumBoardMemberRecord = typeof condominiumBoardMembers.$inferSelect

export class CondominiumBoardMembersRepository extends BaseRepository<
  typeof condominiumBoardMembers,
  TCondominiumBoardMember,
  TCondominiumBoardMemberCreate,
  TCondominiumBoardMemberUpdate
> {
  constructor(db: TDrizzleClient) {
    super(db, condominiumBoardMembers)
  }

  protected mapToEntity(record: unknown): TCondominiumBoardMember {
    const r = record as TCondominiumBoardMemberRecord
    return {
      id: r.id,
      condominiumId: r.condominiumId,
      userId: r.userId,
      position: r.position,
      status: r.status,
      electedAt: r.electedAt,
      termEndsAt: r.termEndsAt ?? null,
      assemblyMinuteId: r.assemblyMinuteId ?? null,
      notes: r.notes ?? null,
      createdBy: r.createdBy ?? null,
      createdAt: r.createdAt ?? new Date(),
      updatedAt: r.updatedAt ?? new Date(),
    }
  }

  async findByCondominium(condominiumId: string): Promise<TCondominiumBoardMember[]> {
    const results = await this.db
      .select()
      .from(condominiumBoardMembers)
      .where(eq(condominiumBoardMembers.condominiumId, condominiumId))
      .orderBy(condominiumBoardMembers.position)

    return results.map(r => this.mapToEntity(r))
  }

  async findActiveByCondominium(condominiumId: string): Promise<TCondominiumBoardMember[]> {
    const results = await this.db
      .select()
      .from(condominiumBoardMembers)
      .where(
        and(
          eq(condominiumBoardMembers.condominiumId, condominiumId),
          eq(condominiumBoardMembers.status, 'active')
        )
      )
      .orderBy(condominiumBoardMembers.position)

    return results.map(r => this.mapToEntity(r))
  }

  async findByPosition(
    condominiumId: string,
    position: string
  ): Promise<TCondominiumBoardMember | null> {
    const results = await this.db
      .select()
      .from(condominiumBoardMembers)
      .where(
        and(
          eq(condominiumBoardMembers.condominiumId, condominiumId),
          eq(condominiumBoardMembers.position, position as any)
        )
      )

    if (results.length === 0) return null
    return this.mapToEntity(results[0])
  }
}
