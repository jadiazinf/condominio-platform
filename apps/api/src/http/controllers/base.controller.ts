import type { Context } from 'hono'
import { HttpContext } from '../context'
import type { IRepository } from '@database/repositories/interfaces'
import type { TRouteDefinition } from './types'
import { createRouter } from './create-router'

/**
 * Base controller providing common CRUD handlers and utilities.
 * Uses dependency injection for the repository.
 *
 * @template TEntity - The entity type returned by the repository
 * @template TCreate - The DTO type for creating entities
 * @template TUpdate - The DTO type for updating entities
 */
export abstract class BaseController<TEntity, TCreate, TUpdate> {
  constructor(protected readonly repository: IRepository<TEntity, TCreate, TUpdate>) {
    // Bind methods to ensure correct 'this' context when used as route handlers
    this.list = this.list.bind(this)
    this.getById = this.getById.bind(this)
    this.create = this.create.bind(this)
    this.update = this.update.bind(this)
    this.delete = this.delete.bind(this)
  }

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
  // Standard CRUD Handlers
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Handler: List all entities.
   */
  protected async list(c: Context): Promise<Response> {
    const ctx = this.ctx(c)

    try {
      const entities = await this.repository.listAll()
      return ctx.ok({ data: entities })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  /**
   * Handler: Get entity by ID.
   * Expects params.id to be set by middleware.
   */
  protected async getById(c: Context): Promise<Response> {
    const ctx = this.ctx<unknown, unknown, { id: string }>(c)

    try {
      const entity = await this.repository.getById(ctx.params.id)

      if (!entity) {
        return ctx.notFound({ error: 'Resource not found' })
      }

      return ctx.ok({ data: entity })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  /**
   * Handler: Create entity.
   * Expects body to be validated by middleware.
   */
  protected async create(c: Context): Promise<Response> {
    const ctx = this.ctx<TCreate>(c)

    try {
      const entity = await this.repository.create(ctx.body)
      return ctx.created({ data: entity })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  /**
   * Handler: Update entity.
   * Expects params.id and body to be set/validated by middleware.
   */
  protected async update(c: Context): Promise<Response> {
    const ctx = this.ctx<TUpdate, unknown, { id: string }>(c)

    try {
      const entity = await this.repository.update(ctx.params.id, ctx.body)

      if (!entity) {
        return ctx.notFound({ error: 'Resource not found' })
      }

      return ctx.ok({ data: entity })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  /**
   * Handler: Delete entity (soft delete).
   * Expects params.id to be set by middleware.
   */
  protected async delete(c: Context): Promise<Response> {
    const ctx = this.ctx<unknown, unknown, { id: string }>(c)

    try {
      const success = await this.repository.delete(ctx.params.id)

      if (!success) {
        return ctx.notFound({ error: 'Resource not found' })
      }

      return ctx.noContent()
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Error Handling
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Handles errors consistently across all controllers.
   */
  protected handleError(ctx: HttpContext, error: unknown): Response | Promise<Response> {
    console.error('Controller error:', error)

    if (error instanceof Error) {
      if (error.message.includes('duplicate key') || error.message.includes('unique constraint')) {
        return ctx.conflict({ error: 'Resource already exists' })
      }

      if (error.message.includes('foreign key') || error.message.includes('violates foreign key')) {
        return ctx.badRequest({ error: 'Invalid reference to related resource' })
      }
    }

    return ctx.internalError({ error: 'An unexpected error occurred' })
  }
}
