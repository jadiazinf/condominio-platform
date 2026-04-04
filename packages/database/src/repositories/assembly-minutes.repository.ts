import { eq, and, desc } from 'drizzle-orm'
import type { TAssemblyMinute, TAssemblyMinuteCreate, TAssemblyMinuteUpdate } from '@packages/domain'
import { assemblyMinutes } from '../drizzle/schema'
import type { TDrizzleClient } from './interfaces'
import { BaseRepository } from './base'

type TAssemblyMinuteRecord = typeof assemblyMinutes.$inferSelect

export class AssemblyMinutesRepository extends BaseRepository<
  typeof assemblyMinutes,
  TAssemblyMinute,
  TAssemblyMinuteCreate,
  TAssemblyMinuteUpdate
> {
  constructor(db: TDrizzleClient) {
    super(db, assemblyMinutes)
  }

  protected mapToEntity(record: unknown): TAssemblyMinute {
    const r = record as TAssemblyMinuteRecord
    return {
      id: r.id,
      condominiumId: r.condominiumId,
      title: r.title,
      assemblyType: r.assemblyType,
      assemblyDate: r.assemblyDate,
      assemblyLocation: r.assemblyLocation,
      quorumPercentage: r.quorumPercentage,
      attendeesCount: r.attendeesCount,
      totalUnits: r.totalUnits,
      agenda: r.agenda,
      decisions: r.decisions as Record<string, unknown> | null,
      notes: r.notes,
      documentUrl: r.documentUrl,
      documentFileName: r.documentFileName,
      status: r.status,
      isActive: r.isActive ?? true,
      createdBy: r.createdBy,
      createdAt: r.createdAt ?? new Date(),
      updatedAt: r.updatedAt ?? new Date(),
    }
  }

  async findByCondominium(condominiumId: string): Promise<TAssemblyMinute[]> {
    const results = await this.db
      .select()
      .from(assemblyMinutes)
      .where(eq(assemblyMinutes.condominiumId, condominiumId))
      .orderBy(desc(assemblyMinutes.assemblyDate))

    return results.map(r => this.mapToEntity(r))
  }

  async findActiveByCondominium(condominiumId: string): Promise<TAssemblyMinute[]> {
    const results = await this.db
      .select()
      .from(assemblyMinutes)
      .where(
        and(
          eq(assemblyMinutes.condominiumId, condominiumId),
          eq(assemblyMinutes.status, 'approved'),
          eq(assemblyMinutes.isActive, true)
        )
      )
      .orderBy(desc(assemblyMinutes.assemblyDate))

    return results.map(r => this.mapToEntity(r))
  }
}
