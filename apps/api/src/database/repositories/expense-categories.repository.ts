import { eq, isNull } from 'drizzle-orm'
import type {
  TExpenseCategory,
  TExpenseCategoryCreate,
  TExpenseCategoryUpdate,
} from '@packages/domain'
import { expenseCategories } from '@database/drizzle/schema'
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

  protected mapToInsertValues(dto: TExpenseCategoryCreate): Record<string, unknown> {
    return {
      name: dto.name,
      description: dto.description,
      parentCategoryId: dto.parentCategoryId,
      isActive: dto.isActive,
      registeredBy: dto.registeredBy,
    }
  }

  protected mapToUpdateValues(dto: TExpenseCategoryUpdate): Record<string, unknown> {
    const values: Record<string, unknown> = {}

    if (dto.name !== undefined) values.name = dto.name
    if (dto.description !== undefined) values.description = dto.description
    if (dto.parentCategoryId !== undefined) values.parentCategoryId = dto.parentCategoryId
    if (dto.isActive !== undefined) values.isActive = dto.isActive
    if (dto.registeredBy !== undefined) values.registeredBy = dto.registeredBy

    return values
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
