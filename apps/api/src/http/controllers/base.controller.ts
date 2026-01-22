import type { Context } from 'hono'
import { HttpContext } from '../context'
import type { IRepository } from '@database/repositories/interfaces'
import type { TRouteDefinition } from './types'
import { createRouter } from './create-router'
import { AppError } from '@errors/index'

/**
 * Base controller providing common CRUD handlers and utilities.
 * Uses dependency injection for the repository.
 * Arrow functions are used for handlers to maintain correct 'this' context.
 *
 * @template TEntity - The entity type returned by the repository
 * @template TCreate - The DTO type for creating entities
 * @template TUpdate - The DTO type for updating entities
 */
export abstract class BaseController<TEntity, TCreate, TUpdate> {
  constructor(protected readonly repository: IRepository<TEntity, TCreate, TUpdate>) {}

  /**
   * Returns the route definitions for this controller.
   * Override this in subclasses to define routes declaratively.
   */
  abstract get routes(): TRouteDefinition[]

  /**
   * Creates the Hono router from the route definitions.
   */
  createRouter() {
    return createRouter(this.routes)
  }

  /**
   * Creates a typed HttpContext from the raw Hono context.
   */
  protected ctx<TBody = unknown, TQuery = unknown, TParams = unknown>(c: Context) {
    return new HttpContext<TBody, TQuery, TParams>(c)
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Standard CRUD Handlers (Arrow functions for automatic 'this' binding)
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Handler: List all entities.
   */
  protected list = async (c: Context): Promise<Response> => {
    const ctx = this.ctx(c)
    const entities = await this.repository.listAll()
    return ctx.ok({ data: entities })
  }

  /**
   * Handler: Get entity by ID.
   * Expects params.id to be set by middleware.
   */
  protected getById = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, unknown, { id: string }>(c)
    const entity = await this.repository.getById(ctx.params.id)

    if (!entity) {
      throw AppError.notFound('Resource', ctx.params.id)
    }

    return ctx.ok({ data: entity })
  }

  /**
   * Handler: Create entity.
   * Expects body to be validated by middleware.
   */
  protected create = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<TCreate>(c)
    const entity = await this.repository.create(ctx.body)
    return ctx.created({ data: entity })
  }

  /**
   * Handler: Update entity.
   * Expects params.id and body to be set/validated by middleware.
   */
  protected update = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<TUpdate, unknown, { id: string }>(c)
    const entity = await this.repository.update(ctx.params.id, ctx.body)

    if (!entity) {
      throw AppError.notFound('Resource', ctx.params.id)
    }

    return ctx.ok({ data: entity })
  }

  /**
   * Handler: Delete entity (soft delete).
   * Expects params.id to be set by middleware.
   */
  protected delete = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, unknown, { id: string }>(c)
    const success = await this.repository.delete(ctx.params.id)

    if (!success) {
      throw AppError.notFound('Resource', ctx.params.id)
    }

    return ctx.noContent()
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Error Handling (Deprecated - errors now handled by global middleware)
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * @deprecated Use throw instead - errors are now handled by global middleware.
   * This method is kept for backwards compatibility with existing controllers.
   * Simply re-throws the error to be caught by the error handler middleware.
   */
  protected handleError(_ctx: HttpContext, error: unknown): never {
    throw error
  }
}
