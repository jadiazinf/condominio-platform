import { Hono } from 'hono'
import type { IRepository } from '@database/repositories/interfaces'
import { applyI18nMiddleware } from '@http/middlewares/locales'
import { applyErrorHandler } from '@http/middlewares/error-handler'
import type { TFieldError } from '@http/responses/types'
import type { ErrorCode } from '@errors/index'

/**
 * Standard API response type for tests.
 * Supports both old format (error as string) and new format (error as object).
 */
export interface IApiResponse {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data?: any
  error?: string | { code: ErrorCode; message: string; details?: Record<string, unknown> }
  message?: string
  success?: boolean
}

/**
 * Standardized error response type for validation and other errors.
 */
export interface IStandardErrorResponse {
  success: false
  error: {
    code: string
    message: string
    fields?: TFieldError[]
    details?: Record<string, unknown>
  }
}

/**
 * Helper to extract error message from response.
 * Works with both old format (error as string) and new format (error as object).
 */
export function getErrorMessage(response: IApiResponse | IStandardErrorResponse): string {
  if (!response.error) return ''
  if (typeof response.error === 'string') return response.error
  return response.error.message
}

/**
 * Helper to parse JSON response with proper typing.
 */
export async function parseJson(response: Response): Promise<IApiResponse> {
  return response.json() as Promise<IApiResponse>
}

/**
 * Creates a Hono test app with error handler and i18n middleware configured.
 * Error handler must be first to catch all errors from subsequent middlewares and routes.
 */
export function createTestApp(): Hono {
  const app = new Hono()
  applyErrorHandler(app)
  applyI18nMiddleware(app)
  return app
}

/**
 * Creates a mock repository for testing controllers.
 */
export function createMockRepository<TEntity, TCreate, TUpdate>(
  overrides: Partial<IRepository<TEntity, TCreate, TUpdate>> = {}
): IRepository<TEntity, TCreate, TUpdate> {
  return {
    listAll: async () => [],
    getById: async () => null,
    create: async (data: TCreate) => data as unknown as TEntity,
    update: async () => null,
    delete: async () => false,
    ...overrides,
  }
}

/**
 * Helper to extract JSON response data.
 */
export async function getResponseJson<T>(response: Response): Promise<T> {
  return response.json() as Promise<T>
}

/**
 * Helper to check response status.
 */
export function expectStatus(response: Response, status: number): void {
  if (response.status !== status) {
    throw new Error(`Expected status ${status}, got ${response.status}`)
  }
}

/**
 * Entity factory for creating test data with auto-generated IDs.
 */
export function withId<T extends Record<string, unknown>>(
  data: T,
  id?: string
): T & { id: string } {
  return {
    ...data,
    id: id ?? crypto.randomUUID(),
    createdAt: new Date(),
    updatedAt: new Date(),
  }
}

/**
 * Type for mock repository with additional custom methods.
 */
export type TMockRepository<TEntity, TCreate, TUpdate, TCustom = object> = IRepository<
  TEntity,
  TCreate,
  TUpdate
> &
  TCustom
