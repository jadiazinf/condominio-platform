import { eq, isNull } from 'drizzle-orm'
import type {
  TExpenseCategory,
  TExpenseCategoryCreate,
  TExpenseCategoryUpdate,
} from '@packages/domain'
import { expenseCategories } from '../drizzle/schema'
import type { TDrizzleClient, IRepository } from './interfaces'
import { BaseRepository } from './base'

type TExpenseCategoryRecord = typeof expenseCategories.$inferSelect

/**
 * Repository for managing expense category entities.
 * Implements soft delete pattern via isActive flag.
 */
export class ExpenseCategoriesRepository
  extends BaseRepository<
    typeof expenseCategories,
    TExpenseCategory,
    TExpenseCategoryCreate,
    TExpenseCategoryUpdate
  >
  implements IRepository<TExpenseCategory, TExpenseCategoryCreate, TExpenseCategoryUpdate>
{
  constructor(db: TDrizzleClient) {
    super(db, expenseCategories)
  }

  protected mapToEntity(record: unknown): TExpenseCategory {
    const r = record as TExpenseCategoryRecord
    return {
      id: r.id,
      name: r.name,
      description: r.description,
      parentCategoryId: r.parentCategoryId,
      isActive: r.isActive ?? true,
      registeredBy: r.registeredBy,
      createdAt: r.createdAt ?? new Date(),
    }
  }

  /**
   * Retrieves root categories (no parent).
   */
  async getRootCategories(includeInactive = false): Promise<TExpenseCategory[]> {
    const results = await this.db
      .select()
      .from(expenseCategories)
      .where(isNull(expenseCategories.parentCategoryId))

    const mapped = results.map(record => this.mapToEntity(record))

    if (includeInactive) {
      return mapped
    }

    return mapped.filter(c => c.isActive)
  }

  /**
   * Retrieves child categories of a parent.
   */
  async getByParentId(
    parentCategoryId: string,
    includeInactive = false
  ): Promise<TExpenseCategory[]> {
    const results = await this.db
      .select()
      .from(expenseCategories)
      .where(eq(expenseCategories.parentCategoryId, parentCategoryId))

    const mapped = results.map(record => this.mapToEntity(record))

    if (includeInactive) {
      return mapped
    }

    return mapped.filter(c => c.isActive)
  }
}
