import { eq, desc } from 'drizzle-orm'
import type { TBudgetItem, TBudgetItemCreate, TBudgetItemUpdate } from '@packages/domain'
import { budgetItems } from '../drizzle/schema'
import type { TDrizzleClient, IRepositoryWithHardDelete } from './interfaces'
import { BaseRepository } from './base'

type TBudgetItemRecord = typeof budgetItems.$inferSelect

export class BudgetItemsRepository
  extends BaseRepository<typeof budgetItems, TBudgetItem, TBudgetItemCreate, TBudgetItemUpdate>
  implements IRepositoryWithHardDelete<TBudgetItem, TBudgetItemCreate, TBudgetItemUpdate>
{
  constructor(db: TDrizzleClient) {
    super(db, budgetItems)
  }

  protected mapToEntity(record: unknown): TBudgetItem {
    const r = record as TBudgetItemRecord
    return {
      id: r.id,
      budgetId: r.budgetId,
      expenseCategoryId: r.expenseCategoryId,
      description: r.description,
      budgetedAmount: r.budgetedAmount,
      notes: r.notes,
      createdAt: r.createdAt ?? new Date(),
      updatedAt: r.updatedAt ?? new Date(),
    }
  }

  override async listAll(): Promise<TBudgetItem[]> {
    const results = await this.db.select().from(budgetItems).orderBy(desc(budgetItems.createdAt))
    return results.map(record => this.mapToEntity(record))
  }

  override async delete(id: string): Promise<boolean> {
    return this.hardDelete(id)
  }

  async getByBudgetId(budgetId: string): Promise<TBudgetItem[]> {
    const results = await this.db
      .select()
      .from(budgetItems)
      .where(eq(budgetItems.budgetId, budgetId))
      .orderBy(desc(budgetItems.createdAt))

    return results.map(record => this.mapToEntity(record))
  }
}
