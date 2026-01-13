/**
 * Expenses Endpoints Types
 *
 * Type definitions for expense-related API endpoints:
 * - Expenses
 * - Expense Categories
 */

import type {
  TExpense,
  TExpenseCreate,
  TExpenseUpdate,
  TExpenseStatus,
  TExpenseCategory,
  TExpenseCategoryCreate,
  TExpenseCategoryUpdate,
} from '@packages/domain'
import type { TEndpointDefinition, TIdParam } from './base'
import type { TApiDataResponse } from '../api-responses'

// =============================================================================
// Expenses Endpoints
// =============================================================================

type TCondominiumIdParam = { condominiumId: string }
type TBuildingIdParam = { buildingId: string }
type TCategoryIdParam = { categoryId: string }
type TExpenseStatusParam = { status: TExpenseStatus }
type TDateRangeQuery = { startDate: string; endDate: string }

/** GET /expenses - List all */
export type TExpensesListEndpoint = TEndpointDefinition<
  'GET',
  '/expenses',
  TApiDataResponse<TExpense[]>
>

/** GET /expenses/pending-approval - Get pending approval */
export type TExpensesGetPendingApprovalEndpoint = TEndpointDefinition<
  'GET',
  '/expenses/pending-approval',
  TApiDataResponse<TExpense[]>
>

/** GET /expenses/condominium/:condominiumId - Get by condominium */
export type TExpensesGetByCondominiumEndpoint = TEndpointDefinition<
  'GET',
  '/expenses/condominium/:condominiumId',
  TApiDataResponse<TExpense[]>,
  void,
  TCondominiumIdParam
>

/** GET /expenses/building/:buildingId - Get by building */
export type TExpensesGetByBuildingEndpoint = TEndpointDefinition<
  'GET',
  '/expenses/building/:buildingId',
  TApiDataResponse<TExpense[]>,
  void,
  TBuildingIdParam
>

/** GET /expenses/category/:categoryId - Get by category */
export type TExpensesGetByCategoryEndpoint = TEndpointDefinition<
  'GET',
  '/expenses/category/:categoryId',
  TApiDataResponse<TExpense[]>,
  void,
  TCategoryIdParam
>

/** GET /expenses/status/:status - Get by status */
export type TExpensesGetByStatusEndpoint = TEndpointDefinition<
  'GET',
  '/expenses/status/:status',
  TApiDataResponse<TExpense[]>,
  void,
  TExpenseStatusParam
>

/** GET /expenses/date-range - Get by date range */
export type TExpensesGetByDateRangeEndpoint = TEndpointDefinition<
  'GET',
  '/expenses/date-range',
  TApiDataResponse<TExpense[]>,
  void,
  void,
  TDateRangeQuery
>

/** GET /expenses/:id - Get by ID */
export type TExpensesGetByIdEndpoint = TEndpointDefinition<
  'GET',
  '/expenses/:id',
  TApiDataResponse<TExpense>,
  void,
  TIdParam
>

/** POST /expenses - Create */
export type TExpensesCreateEndpoint = TEndpointDefinition<
  'POST',
  '/expenses',
  TApiDataResponse<TExpense>,
  TExpenseCreate
>

/** PATCH /expenses/:id - Update */
export type TExpensesUpdateEndpoint = TEndpointDefinition<
  'PATCH',
  '/expenses/:id',
  TApiDataResponse<TExpense>,
  TExpenseUpdate,
  TIdParam
>

/** DELETE /expenses/:id - Delete */
export type TExpensesDeleteEndpoint = TEndpointDefinition<
  'DELETE',
  '/expenses/:id',
  void,
  void,
  TIdParam
>

export type TExpensesEndpoints = {
  list: TExpensesListEndpoint
  getPendingApproval: TExpensesGetPendingApprovalEndpoint
  getByCondominium: TExpensesGetByCondominiumEndpoint
  getByBuilding: TExpensesGetByBuildingEndpoint
  getByCategory: TExpensesGetByCategoryEndpoint
  getByStatus: TExpensesGetByStatusEndpoint
  getByDateRange: TExpensesGetByDateRangeEndpoint
  getById: TExpensesGetByIdEndpoint
  create: TExpensesCreateEndpoint
  update: TExpensesUpdateEndpoint
  delete: TExpensesDeleteEndpoint
}

// =============================================================================
// Expense Categories Endpoints
// =============================================================================

type TParentCategoryIdParam = { parentCategoryId: string }

/** GET /expense-categories - List all */
export type TExpenseCategoriesListEndpoint = TEndpointDefinition<
  'GET',
  '/expense-categories',
  TApiDataResponse<TExpenseCategory[]>
>

/** GET /expense-categories/root - Get root categories */
export type TExpenseCategoriesGetRootEndpoint = TEndpointDefinition<
  'GET',
  '/expense-categories/root',
  TApiDataResponse<TExpenseCategory[]>
>

/** GET /expense-categories/parent/:parentCategoryId - Get by parent */
export type TExpenseCategoriesGetByParentEndpoint = TEndpointDefinition<
  'GET',
  '/expense-categories/parent/:parentCategoryId',
  TApiDataResponse<TExpenseCategory[]>,
  void,
  TParentCategoryIdParam
>

/** GET /expense-categories/:id - Get by ID */
export type TExpenseCategoriesGetByIdEndpoint = TEndpointDefinition<
  'GET',
  '/expense-categories/:id',
  TApiDataResponse<TExpenseCategory>,
  void,
  TIdParam
>

/** POST /expense-categories - Create */
export type TExpenseCategoriesCreateEndpoint = TEndpointDefinition<
  'POST',
  '/expense-categories',
  TApiDataResponse<TExpenseCategory>,
  TExpenseCategoryCreate
>

/** PATCH /expense-categories/:id - Update */
export type TExpenseCategoriesUpdateEndpoint = TEndpointDefinition<
  'PATCH',
  '/expense-categories/:id',
  TApiDataResponse<TExpenseCategory>,
  TExpenseCategoryUpdate,
  TIdParam
>

/** DELETE /expense-categories/:id - Delete */
export type TExpenseCategoriesDeleteEndpoint = TEndpointDefinition<
  'DELETE',
  '/expense-categories/:id',
  void,
  void,
  TIdParam
>

export type TExpenseCategoriesEndpoints = {
  list: TExpenseCategoriesListEndpoint
  getRoot: TExpenseCategoriesGetRootEndpoint
  getByParent: TExpenseCategoriesGetByParentEndpoint
  getById: TExpenseCategoriesGetByIdEndpoint
  create: TExpenseCategoriesCreateEndpoint
  update: TExpenseCategoriesUpdateEndpoint
  delete: TExpenseCategoriesDeleteEndpoint
}
