import { and, eq, desc } from 'drizzle-orm'
import type { TBudget, TBudgetCreate, TBudgetUpdate } from '@packages/domain'
import { budgets } from '../drizzle/schema'
import type { TDrizzleClient, IRepositoryWithHardDelete } from './interfaces'
import { BaseRepository } from './base'

type TBudgetRecord = typeof budgets.$inferSelect

export class BudgetsRepository
  extends BaseRepository<typeof budgets, TBudget, TBudgetCreate, TBudgetUpdate>
  implements IRepositoryWithHardDelete<TBudget, TBudgetCreate, TBudgetUpdate>
{
  constructor(db: TDrizzleClient) {
    super(db, budgets)
  }

  protected mapToEntity(record: unknown): TBudget {
    const r = record as TBudgetRecord
    return {
      id: r.id,
      condominiumId: r.condominiumId,
      name: r.name,
      description: r.description,
      budgetType: r.budgetType as TBudget['budgetType'],
      periodYear: r.periodYear,
      periodMonth: r.periodMonth,
      currencyId: r.currencyId,
      status: (r.status ?? 'draft') as TBudget['status'],
      totalAmount: r.totalAmount,
      reserveFundPercentage: r.reserveFundPercentage,
      approvedBy: r.approvedBy,
      approvedAt: r.approvedAt,
      notes: r.notes,
      metadata: r.metadata as Record<string, unknown> | null,
      createdBy: r.createdBy,
      createdAt: r.createdAt ?? new Date(),
      updatedAt: r.updatedAt ?? new Date(),
    }
  }

  override async listAll(): Promise<TBudget[]> {
    const results = await this.db.select().from(budgets).orderBy(desc(budgets.createdAt))
    return results.map(record => this.mapToEntity(record))
  }

  override async delete(id: string): Promise<boolean> {
    return this.hardDelete(id)
  }

  async getByCondominiumId(condominiumId: string): Promise<TBudget[]> {
    const results = await this.db
      .select()
      .from(budgets)
      .where(eq(budgets.condominiumId, condominiumId))
      .orderBy(desc(budgets.periodYear), desc(budgets.periodMonth))

    return results.map(record => this.mapToEntity(record))
  }

  async getByCondominiumAndPeriod(
    condominiumId: string,
    periodYear: number,
    periodMonth: number | null,
    budgetType: TBudget['budgetType']
  ): Promise<TBudget | null> {
    const conditions = [
      eq(budgets.condominiumId, condominiumId),
      eq(budgets.periodYear, periodYear),
      eq(budgets.budgetType, budgetType),
    ]

    if (periodMonth !== null) {
      conditions.push(eq(budgets.periodMonth, periodMonth))
    }

    const results = await this.db
      .select()
      .from(budgets)
      .where(and(...conditions))
      .limit(1)

    return results[0] ? this.mapToEntity(results[0]) : null
  }

  async getActiveByCondominium(condominiumId: string): Promise<TBudget[]> {
    const results = await this.db
      .select()
      .from(budgets)
      .where(and(eq(budgets.condominiumId, condominiumId), eq(budgets.status, 'active')))
      .orderBy(desc(budgets.periodYear), desc(budgets.periodMonth))

    return results.map(record => this.mapToEntity(record))
  }
}
