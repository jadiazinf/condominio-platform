/**
 * Permissions Endpoints Types
 *
 * Type definitions for all permission-related API endpoints.
 */

import type { TPermission, TPermissionCreate, TPermissionUpdate } from '@packages/domain'
import type { TEndpointDefinition, TIdParam } from './base'
import type { TApiDataResponse } from '../api-responses'

// Custom param types
type TModuleParam = { module: string }
type TModuleAndActionParam = { module: string; action: string }

// ─────────────────────────────────────────────────────────────────────────────
// Permissions Endpoints
// ─────────────────────────────────────────────────────────────────────────────

/** GET /permissions - List all permissions */
export type TPermissionsListEndpoint = TEndpointDefinition<
  'GET',
  '/permissions',
  TApiDataResponse<TPermission[]>
>

/** GET /permissions/module/:module - Get permissions by module */
export type TPermissionsGetByModuleEndpoint = TEndpointDefinition<
  'GET',
  '/permissions/module/:module',
  TApiDataResponse<TPermission[]>,
  void,
  TModuleParam
>

/** GET /permissions/module/:module/action/:action - Get permission by module and action */
export type TPermissionsGetByModuleAndActionEndpoint = TEndpointDefinition<
  'GET',
  '/permissions/module/:module/action/:action',
  TApiDataResponse<TPermission>,
  void,
  TModuleAndActionParam
>

/** GET /permissions/:id - Get permission by ID */
export type TPermissionsGetByIdEndpoint = TEndpointDefinition<
  'GET',
  '/permissions/:id',
  TApiDataResponse<TPermission>,
  void,
  TIdParam
>

/** POST /permissions - Create permission */
export type TPermissionsCreateEndpoint = TEndpointDefinition<
  'POST',
  '/permissions',
  TApiDataResponse<TPermission>,
  TPermissionCreate
>

/** PATCH /permissions/:id - Update permission */
export type TPermissionsUpdateEndpoint = TEndpointDefinition<
  'PATCH',
  '/permissions/:id',
  TApiDataResponse<TPermission>,
  TPermissionUpdate,
  TIdParam
>

/** DELETE /permissions/:id - Delete permission */
export type TPermissionsDeleteEndpoint = TEndpointDefinition<
  'DELETE',
  '/permissions/:id',
  void,
  void,
  TIdParam
>

// ─────────────────────────────────────────────────────────────────────────────
// Aggregated Permissions API Types
// ─────────────────────────────────────────────────────────────────────────────

export type TPermissionsEndpoints = {
  list: TPermissionsListEndpoint
  getByModule: TPermissionsGetByModuleEndpoint
  getByModuleAndAction: TPermissionsGetByModuleAndActionEndpoint
  getById: TPermissionsGetByIdEndpoint
  create: TPermissionsCreateEndpoint
  update: TPermissionsUpdateEndpoint
  delete: TPermissionsDeleteEndpoint
}
