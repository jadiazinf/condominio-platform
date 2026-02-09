import { and, eq, lte } from 'drizzle-orm'
import type {
  TQuotaGenerationSchedule,
  TQuotaGenerationScheduleCreate,
  TQuotaGenerationScheduleUpdate,
} from '@packages/domain'
import { quotaGenerationSchedules } from '@database/drizzle/schema'
import type { TDrizzleClient, IRepository } from './interfaces'
import { BaseRepository } from './base'

type TQuotaGenerationScheduleRecord = typeof quotaGenerationSchedules.$inferSelect

/**
 * Repository for managing quota generation schedule entities.
 * Schedules define when and how often quotas are generated for a rule.
 * Implements soft delete pattern via isActive flag.
 */
export class QuotaGenerationSchedulesRepository
  extends BaseRepository<
    typeof quotaGenerationSchedules,
    TQuotaGenerationSchedule,
    TQuotaGenerationScheduleCreate,
    TQuotaGenerationScheduleUpdate
  >
  implements
    IRepository<TQuotaGenerationSchedule, TQuotaGenerationScheduleCreate, TQuotaGenerationScheduleUpdate>
{
  constructor(db: TDrizzleClient) {
    super(db, quotaGenerationSchedules)
  }

  protected mapToEntity(record: unknown): TQuotaGenerationSchedule {
    const r = record as TQuotaGenerationScheduleRecord
    return {
      id: r.id,
      quotaGenerationRuleId: r.quotaGenerationRuleId,
      name: r.name,
      frequencyType: r.frequencyType,
      frequencyValue: r.frequencyValue,
      generationDay: r.generationDay,
      periodsInAdvance: r.periodsInAdvance ?? 1,
      issueDay: r.issueDay,
      dueDay: r.dueDay,
      graceDays: r.graceDays ?? 0,
      isActive: r.isActive ?? true,
      lastGeneratedPeriod: r.lastGeneratedPeriod,
      lastGeneratedAt: r.lastGeneratedAt,
      nextGenerationDate: r.nextGenerationDate,
      createdBy: r.createdBy,
      createdAt: r.createdAt ?? new Date(),
      updatedBy: r.updatedBy,
      updatedAt: r.updatedAt ?? new Date(),
      updateReason: r.updateReason,
    }
  }

  protected mapToInsertValues(dto: TQuotaGenerationScheduleCreate): Record<string, unknown> {
    return {
      quotaGenerationRuleId: dto.quotaGenerationRuleId,
      name: dto.name,
      frequencyType: dto.frequencyType,
      frequencyValue: dto.frequencyValue,
      generationDay: dto.generationDay,
      periodsInAdvance: dto.periodsInAdvance,
      issueDay: dto.issueDay,
      dueDay: dto.dueDay,
      graceDays: dto.graceDays,
      isActive: dto.isActive,
      createdBy: dto.createdBy,
    }
  }

  protected mapToUpdateValues(dto: TQuotaGenerationScheduleUpdate): Record<string, unknown> {
    const values: Record<string, unknown> = {}

    if (dto.name !== undefined) values.name = dto.name
    if (dto.frequencyType !== undefined) values.frequencyType = dto.frequencyType
    if (dto.frequencyValue !== undefined) values.frequencyValue = dto.frequencyValue
    if (dto.generationDay !== undefined) values.generationDay = dto.generationDay
    if (dto.periodsInAdvance !== undefined) values.periodsInAdvance = dto.periodsInAdvance
    if (dto.issueDay !== undefined) values.issueDay = dto.issueDay
    if (dto.dueDay !== undefined) values.dueDay = dto.dueDay
    if (dto.graceDays !== undefined) values.graceDays = dto.graceDays
    if (dto.isActive !== undefined) values.isActive = dto.isActive
    if (dto.lastGeneratedPeriod !== undefined) values.lastGeneratedPeriod = dto.lastGeneratedPeriod
    if (dto.lastGeneratedAt !== undefined) values.lastGeneratedAt = dto.lastGeneratedAt
    if (dto.nextGenerationDate !== undefined) values.nextGenerationDate = dto.nextGenerationDate
    if (dto.updatedBy !== undefined) values.updatedBy = dto.updatedBy
    if (dto.updateReason !== undefined) values.updateReason = dto.updateReason

    return values
  }

  /**
   * Retrieves active schedules that are due for generation.
   * A schedule is due if nextGenerationDate <= asOfDate and isActive is true.
   */
  async getDueSchedules(asOfDate: string): Promise<TQuotaGenerationSchedule[]> {
    const results = await this.db
      .select()
      .from(quotaGenerationSchedules)
      .where(
        and(
          eq(quotaGenerationSchedules.isActive, true),
          lte(quotaGenerationSchedules.nextGenerationDate, asOfDate)
        )
      )

    return results.map(record => this.mapToEntity(record))
  }

  /**
   * Retrieves schedules for a specific rule.
   */
  async getByRuleId(ruleId: string): Promise<TQuotaGenerationSchedule[]> {
    const results = await this.db
      .select()
      .from(quotaGenerationSchedules)
      .where(eq(quotaGenerationSchedules.quotaGenerationRuleId, ruleId))

    return results.map(record => this.mapToEntity(record))
  }

  /**
   * Updates tracking fields after a successful quota generation.
   */
  async updateAfterGeneration(
    id: string,
    data: { lastGeneratedPeriod: string; lastGeneratedAt: Date; nextGenerationDate: string }
  ): Promise<void> {
    await this.db
      .update(quotaGenerationSchedules)
      .set({
        lastGeneratedPeriod: data.lastGeneratedPeriod,
        lastGeneratedAt: data.lastGeneratedAt,
        nextGenerationDate: data.nextGenerationDate,
        updatedAt: new Date(),
      })
      .where(eq(quotaGenerationSchedules.id, id))
  }
}
