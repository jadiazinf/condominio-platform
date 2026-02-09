import { eq, desc } from 'drizzle-orm'
import type {
  TQuotaGenerationLog,
  TQuotaGenerationLogCreate,
} from '@packages/domain'
import { quotaGenerationLogs } from '@database/drizzle/schema'
import type { TDrizzleClient, IRepositoryWithHardDelete } from './interfaces'
import { BaseRepository } from './base'

type TQuotaGenerationLogRecord = typeof quotaGenerationLogs.$inferSelect

/**
 * Repository for managing quota generation log entities.
 * Logs are immutable records of generation runs.
 * No soft delete — logs have no isActive field.
 */
export class QuotaGenerationLogsRepository
  extends BaseRepository<
    typeof quotaGenerationLogs,
    TQuotaGenerationLog,
    TQuotaGenerationLogCreate,
    Record<string, never>
  >
  implements
    IRepositoryWithHardDelete<TQuotaGenerationLog, TQuotaGenerationLogCreate, Record<string, never>>
{
  constructor(db: TDrizzleClient) {
    super(db, quotaGenerationLogs)
  }

  protected mapToEntity(record: unknown): TQuotaGenerationLog {
    const r = record as TQuotaGenerationLogRecord
    return {
      id: r.id,
      generationRuleId: r.generationRuleId,
      generationScheduleId: r.generationScheduleId,
      quotaFormulaId: r.quotaFormulaId,
      generationMethod: r.generationMethod,
      periodYear: r.periodYear,
      periodMonth: r.periodMonth,
      periodDescription: r.periodDescription,
      quotasCreated: r.quotasCreated,
      quotasFailed: r.quotasFailed,
      totalAmount: r.totalAmount,
      currencyId: r.currencyId,
      unitsAffected: r.unitsAffected,
      parameters: r.parameters as Record<string, unknown> | null,
      formulaSnapshot: r.formulaSnapshot as Record<string, unknown> | null,
      status: r.status as TQuotaGenerationLog['status'],
      errorDetails: r.errorDetails,
      generatedBy: r.generatedBy,
      generatedAt: r.generatedAt ?? new Date(),
    }
  }

  protected mapToInsertValues(dto: TQuotaGenerationLogCreate): Record<string, unknown> {
    return {
      generationRuleId: dto.generationRuleId,
      generationScheduleId: dto.generationScheduleId,
      quotaFormulaId: dto.quotaFormulaId,
      generationMethod: dto.generationMethod,
      periodYear: dto.periodYear,
      periodMonth: dto.periodMonth,
      periodDescription: dto.periodDescription,
      quotasCreated: dto.quotasCreated,
      quotasFailed: dto.quotasFailed,
      totalAmount: dto.totalAmount,
      currencyId: dto.currencyId,
      unitsAffected: dto.unitsAffected,
      parameters: dto.parameters,
      formulaSnapshot: dto.formulaSnapshot,
      status: dto.status,
      errorDetails: dto.errorDetails,
      generatedBy: dto.generatedBy,
    }
  }

  protected mapToUpdateValues(_dto: Record<string, never>): Record<string, unknown> {
    return {}
  }

  /**
   * Override listAll since logs don't have isActive.
   */
  override async listAll(): Promise<TQuotaGenerationLog[]> {
    const results = await this.db.select().from(quotaGenerationLogs)
    return results.map(record => this.mapToEntity(record))
  }

  /**
   * Retrieves logs for a specific schedule.
   */
  async getByScheduleId(scheduleId: string): Promise<TQuotaGenerationLog[]> {
    const results = await this.db
      .select()
      .from(quotaGenerationLogs)
      .where(eq(quotaGenerationLogs.generationScheduleId, scheduleId))
      .orderBy(desc(quotaGenerationLogs.generatedAt))

    return results.map(record => this.mapToEntity(record))
  }

  /**
   * Retrieves logs for a specific rule.
   */
  async getByRuleId(ruleId: string): Promise<TQuotaGenerationLog[]> {
    const results = await this.db
      .select()
      .from(quotaGenerationLogs)
      .where(eq(quotaGenerationLogs.generationRuleId, ruleId))
      .orderBy(desc(quotaGenerationLogs.generatedAt))

    return results.map(record => this.mapToEntity(record))
  }
}
