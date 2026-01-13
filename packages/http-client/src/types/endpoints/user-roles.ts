/**
 * User Roles Endpoints Types
 *
 * Type definitions for all user-role assignment API endpoints.
 */

import type { TUserRole, TUserRoleCreate, TUserRoleUpdate } from '@packages/domain'
import type { TEndpointDefinition, TIdParam } from './base'
import type { TApiDataResponse } from '../api-responses'

// Custom param types
type TUserIdParam = { userId: string }
type TUserAndCondominiumParam = { userId: string; condominiumId: string }
type TUserAndBuildingParam = { userId: string; buildingId: string }

// Query types
type TCheckRoleQuery = {
  roleId: string
  condominiumId?: string
  buildingId?: string
}

// ─────────────────────────────────────────────────────────────────────────────
// User Roles Endpoints
// ─────────────────────────────────────────────────────────────────────────────

/** GET /user-roles - List all user-roles */
export type TUserRolesListEndpoint = TEndpointDefinition<
  'GET',
  '/user-roles',
  TApiDataResponse<TUserRole[]>
>

/** GET /user-roles/user/:userId - Get by user ID */
export type TUserRolesGetByUserIdEndpoint = TEndpointDefinition<
  'GET',
  '/user-roles/user/:userId',
  TApiDataResponse<TUserRole[]>,
  void,
  TUserIdParam
>

/** GET /user-roles/user/:userId/global - Get global roles for user */
export type TUserRolesGetGlobalByUserEndpoint = TEndpointDefinition<
  'GET',
  '/user-roles/user/:userId/global',
  TApiDataResponse<TUserRole[]>,
  void,
  TUserIdParam
>

/** GET /user-roles/user/:userId/condominium/:condominiumId - Get by user and condominium */
export type TUserRolesGetByUserAndCondominiumEndpoint = TEndpointDefinition<
  'GET',
  '/user-roles/user/:userId/condominium/:condominiumId',
  TApiDataResponse<TUserRole[]>,
  void,
  TUserAndCondominiumParam
>

/** GET /user-roles/user/:userId/building/:buildingId - Get by user and building */
export type TUserRolesGetByUserAndBuildingEndpoint = TEndpointDefinition<
  'GET',
  '/user-roles/user/:userId/building/:buildingId',
  TApiDataResponse<TUserRole[]>,
  void,
  TUserAndBuildingParam
>

/** GET /user-roles/user/:userId/has-role - Check if user has role */
export type TUserRolesCheckHasRoleEndpoint = TEndpointDefinition<
  'GET',
  '/user-roles/user/:userId/has-role',
  TApiDataResponse<{ hasRole: boolean }>,
  void,
  TUserIdParam,
  TCheckRoleQuery
>

/** GET /user-roles/:id - Get by ID */
export type TUserRolesGetByIdEndpoint = TEndpointDefinition<
  'GET',
  '/user-roles/:id',
  TApiDataResponse<TUserRole>,
  void,
  TIdParam
>

/** POST /user-roles - Create user-role */
export type TUserRolesCreateEndpoint = TEndpointDefinition<
  'POST',
  '/user-roles',
  TApiDataResponse<TUserRole>,
  TUserRoleCreate
>

/** PATCH /user-roles/:id - Update user-role */
export type TUserRolesUpdateEndpoint = TEndpointDefinition<
  'PATCH',
  '/user-roles/:id',
  TApiDataResponse<TUserRole>,
  TUserRoleUpdate,
  TIdParam
>

/** DELETE /user-roles/:id - Delete user-role */
export type TUserRolesDeleteEndpoint = TEndpointDefinition<
  'DELETE',
  '/user-roles/:id',
  void,
  void,
  TIdParam
>

// ─────────────────────────────────────────────────────────────────────────────
// Aggregated User Roles API Types
// ─────────────────────────────────────────────────────────────────────────────

export type TUserRolesEndpoints = {
  list: TUserRolesListEndpoint
  getByUserId: TUserRolesGetByUserIdEndpoint
  getGlobalByUser: TUserRolesGetGlobalByUserEndpoint
  getByUserAndCondominium: TUserRolesGetByUserAndCondominiumEndpoint
  getByUserAndBuilding: TUserRolesGetByUserAndBuildingEndpoint
  checkHasRole: TUserRolesCheckHasRoleEndpoint
  getById: TUserRolesGetByIdEndpoint
  create: TUserRolesCreateEndpoint
  update: TUserRolesUpdateEndpoint
  delete: TUserRolesDeleteEndpoint
}
