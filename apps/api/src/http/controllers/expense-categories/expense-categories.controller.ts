import type { Context } from 'hono'
import {
  expenseCategoryCreateSchema,
  expenseCategoryUpdateSchema,
  type TExpenseCategory,
  type TExpenseCategoryCreate,
  type TExpenseCategoryUpdate,
} from '@packages/domain'
import type { ExpenseCategoriesRepository } from '@database/repositories'
import { BaseController } from '../base.controller'
import { bodyValidator, paramsValidator } from '../../middlewares/utils/payload-validator'
import { IdParamSchema } from '../common'
import type { TRouteDefinition } from '../types'
import { authMiddleware, requireRole } from '../../middlewares/auth'
import { z } from 'zod'

const ParentCategoryIdParamSchema = z.object({
  parentCategoryId: z.string().uuid('Invalid parent category ID format'),
})

type TParentCategoryIdParam = z.infer<typeof ParentCategoryIdParamSchema>

/**
 * Controller for managing expense category resources.
 *
 * Expense categories are global and shared across all condominiums.
 * They are not scoped to a specific condominium -- any condominium can use
 * any expense category. No condominium-level filtering is needed here.
 *
 * Endpoints:
 * - GET    /                          List all expense categories
 * - GET    /root                      Get root categories (no parent)
 * - GET    /parent/:parentCategoryId  Get children of a category
 * - GET    /:id                       Get by ID
 * - POST   /                          Create expense category
 * - PATCH  /:id                       Update expense category
 * - DELETE /:id                       Delete expense category
 */
export class ExpenseCategoriesController extends BaseController<
  TExpenseCategory,
  TExpenseCategoryCreate,
  TExpenseCategoryUpdate
> {
  constructor(repository: ExpenseCategoriesRepository) {
    super(repository)
  }

  get routes(): TRouteDefinition[] {
    return [
      { method: 'get', path: '/', handler: this.list, middlewares: [authMiddleware, requireRole('ADMIN', 'ACCOUNTANT')] },
      { method: 'get', path: '/root', handler: this.getRootCategories, middlewares: [authMiddleware, requireRole('ADMIN', 'ACCOUNTANT')] },
      {
        method: 'get',
        path: '/parent/:parentCategoryId',
        handler: this.getByParentId,
        middlewares: [authMiddleware, requireRole('ADMIN', 'ACCOUNTANT'), paramsValidator(ParentCategoryIdParamSchema)],
      },
      {
        method: 'get',
        path: '/:id',
        handler: this.getById,
        middlewares: [authMiddleware, requireRole('ADMIN', 'ACCOUNTANT'), paramsValidator(IdParamSchema)],
      },
      {
        method: 'post',
        path: '/',
        handler: this.create,
        middlewares: [authMiddleware, requireRole('ADMIN'), bodyValidator(expenseCategoryCreateSchema)],
      },
      {
        method: 'patch',
        path: '/:id',
        handler: this.update,
        middlewares: [authMiddleware, requireRole('ADMIN'), paramsValidator(IdParamSchema), bodyValidator(expenseCategoryUpdateSchema)],
      },
      {
        method: 'delete',
        path: '/:id',
        handler: this.delete,
        middlewares: [authMiddleware, requireRole('ADMIN'), paramsValidator(IdParamSchema)],
      },
    ]
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Custom Handlers
  // ─────────────────────────────────────────────────────────────────────────────

  private getRootCategories = async (c: Context): Promise<Response> => {
    const ctx = this.ctx(c)
    const repo = this.repository as ExpenseCategoriesRepository

    try {
      const categories = await repo.getRootCategories()
      return ctx.ok({ data: categories })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private getByParentId = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, unknown, TParentCategoryIdParam>(c)
    const repo = this.repository as ExpenseCategoriesRepository

    try {
      const categories = await repo.getByParentId(ctx.params.parentCategoryId)
      return ctx.ok({ data: categories })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }
}
