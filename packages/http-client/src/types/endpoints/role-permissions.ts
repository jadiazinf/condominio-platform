/**
 * Role Permissions Endpoints Types
 *
 * Type definitions for all role-permission assignment API endpoints.
 */

import type {
  TRolePermission,
  TRolePermissionCreate,
  TRolePermissionUpdate,
} from '@packages/domain'
import type { TEndpointDefinition, TIdParam } from './base'
import type { TApiDataResponse } from '../api-responses'

// Custom param types
type TRoleIdParam = { roleId: string }
type TPermissionIdParam = { permissionId: string }
type TRoleAndPermissionParam = { roleId: string; permissionId: string }

// ─────────────────────────────────────────────────────────────────────────────
// Role Permissions Endpoints
// ─────────────────────────────────────────────────────────────────────────────

/** GET /role-permissions - List all role-permissions */
export type TRolePermissionsListEndpoint = TEndpointDefinition<
  'GET',
  '/role-permissions',
  TApiDataResponse<TRolePermission[]>
>

/** GET /role-permissions/role/:roleId - Get by role ID */
export type TRolePermissionsGetByRoleIdEndpoint = TEndpointDefinition<
  'GET',
  '/role-permissions/role/:roleId',
  TApiDataResponse<TRolePermission[]>,
  void,
  TRoleIdParam
>

/** GET /role-permissions/permission/:permissionId - Get by permission ID */
export type TRolePermissionsGetByPermissionIdEndpoint = TEndpointDefinition<
  'GET',
  '/role-permissions/permission/:permissionId',
  TApiDataResponse<TRolePermission[]>,
  void,
  TPermissionIdParam
>

/** GET /role-permissions/role/:roleId/permission/:permissionId/exists - Check if exists */
export type TRolePermissionsCheckExistsEndpoint = TEndpointDefinition<
  'GET',
  '/role-permissions/role/:roleId/permission/:permissionId/exists',
  TApiDataResponse<{ exists: boolean }>,
  void,
  TRoleAndPermissionParam
>

/** GET /role-permissions/:id - Get by ID */
export type TRolePermissionsGetByIdEndpoint = TEndpointDefinition<
  'GET',
  '/role-permissions/:id',
  TApiDataResponse<TRolePermission>,
  void,
  TIdParam
>

/** POST /role-permissions - Create role-permission */
export type TRolePermissionsCreateEndpoint = TEndpointDefinition<
  'POST',
  '/role-permissions',
  TApiDataResponse<TRolePermission>,
  TRolePermissionCreate
>

/** PATCH /role-permissions/:id - Update role-permission */
export type TRolePermissionsUpdateEndpoint = TEndpointDefinition<
  'PATCH',
  '/role-permissions/:id',
  TApiDataResponse<TRolePermission>,
  TRolePermissionUpdate,
  TIdParam
>

/** DELETE /role-permissions/:id - Delete by ID */
export type TRolePermissionsDeleteEndpoint = TEndpointDefinition<
  'DELETE',
  '/role-permissions/:id',
  void,
  void,
  TIdParam
>

/** DELETE /role-permissions/role/:roleId/permission/:permissionId - Delete by role and permission */
export type TRolePermissionsDeleteByRoleAndPermissionEndpoint = TEndpointDefinition<
  'DELETE',
  '/role-permissions/role/:roleId/permission/:permissionId',
  void,
  void,
  TRoleAndPermissionParam
>

// ─────────────────────────────────────────────────────────────────────────────
// Aggregated Role Permissions API Types
// ─────────────────────────────────────────────────────────────────────────────

export type TRolePermissionsEndpoints = {
  list: TRolePermissionsListEndpoint
  getByRoleId: TRolePermissionsGetByRoleIdEndpoint
  getByPermissionId: TRolePermissionsGetByPermissionIdEndpoint
  checkExists: TRolePermissionsCheckExistsEndpoint
  getById: TRolePermissionsGetByIdEndpoint
  create: TRolePermissionsCreateEndpoint
  update: TRolePermissionsUpdateEndpoint
  delete: TRolePermissionsDeleteEndpoint
  deleteByRoleAndPermission: TRolePermissionsDeleteByRoleAndPermissionEndpoint
}
