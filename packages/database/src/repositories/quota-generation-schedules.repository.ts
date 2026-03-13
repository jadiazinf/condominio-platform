import { and, eq, lte } from 'drizzle-orm'
import type {
  TQuotaGenerationSchedule,
  TQuotaGenerationScheduleCreate,
  TQuotaGenerationScheduleUpdate,
} from '@packages/domain'
import { quotaGenerationSchedules } from '../drizzle/schema'
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
