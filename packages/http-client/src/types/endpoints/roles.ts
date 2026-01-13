/**
 * Roles Endpoints Types
 *
 * Type definitions for all role-related API endpoints.
 */

import type { TRole, TRoleCreate, TRoleUpdate } from '@packages/domain'
import type { TEndpointDefinition, TIdParam, TNameParam } from './base'
import type { TApiDataResponse } from '../api-responses'

// ─────────────────────────────────────────────────────────────────────────────
// Roles Endpoints
// ─────────────────────────────────────────────────────────────────────────────

/** GET /roles - List all roles */
export type TRolesListEndpoint = TEndpointDefinition<'GET', '/roles', TApiDataResponse<TRole[]>>

/** GET /roles/system - Get system roles */
export type TRolesGetSystemEndpoint = TEndpointDefinition<
  'GET',
  '/roles/system',
  TApiDataResponse<TRole[]>
>

/** GET /roles/name/:name - Get role by name */
export type TRolesGetByNameEndpoint = TEndpointDefinition<
  'GET',
  '/roles/name/:name',
  TApiDataResponse<TRole>,
  void,
  TNameParam
>

/** GET /roles/:id - Get role by ID */
export type TRolesGetByIdEndpoint = TEndpointDefinition<
  'GET',
  '/roles/:id',
  TApiDataResponse<TRole>,
  void,
  TIdParam
>

/** POST /roles - Create role */
export type TRolesCreateEndpoint = TEndpointDefinition<
  'POST',
  '/roles',
  TApiDataResponse<TRole>,
  TRoleCreate
>

/** PATCH /roles/:id - Update role */
export type TRolesUpdateEndpoint = TEndpointDefinition<
  'PATCH',
  '/roles/:id',
  TApiDataResponse<TRole>,
  TRoleUpdate,
  TIdParam
>

/** DELETE /roles/:id - Delete role */
export type TRolesDeleteEndpoint = TEndpointDefinition<'DELETE', '/roles/:id', void, void, TIdParam>

// ─────────────────────────────────────────────────────────────────────────────
// Aggregated Roles API Types
// ─────────────────────────────────────────────────────────────────────────────

export type TRolesEndpoints = {
  list: TRolesListEndpoint
  getSystem: TRolesGetSystemEndpoint
  getByName: TRolesGetByNameEndpoint
  getById: TRolesGetByIdEndpoint
  create: TRolesCreateEndpoint
  update: TRolesUpdateEndpoint
  delete: TRolesDeleteEndpoint
}
