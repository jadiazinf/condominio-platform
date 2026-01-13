/**
 * Users Endpoints Types
 *
 * Type definitions for all user-related API endpoints.
 */

import type { TUser, TUserCreate, TUserUpdate } from '@packages/domain'
import type { TEndpointDefinition, TIdParam, TEmailParam } from './base'
import type { TApiDataResponse } from '../api-responses'

// ─────────────────────────────────────────────────────────────────────────────
// Users Endpoints
// ─────────────────────────────────────────────────────────────────────────────

/** GET /users - List all users */
export type TUsersListEndpoint = TEndpointDefinition<'GET', '/users', TApiDataResponse<TUser[]>>

/** GET /users/:id - Get user by ID */
export type TUsersGetByIdEndpoint = TEndpointDefinition<
  'GET',
  '/users/:id',
  TApiDataResponse<TUser>,
  void,
  TIdParam
>

/** GET /users/email/:email - Get user by email */
export type TUsersGetByEmailEndpoint = TEndpointDefinition<
  'GET',
  '/users/email/:email',
  TApiDataResponse<TUser>,
  void,
  TEmailParam
>

/** GET /users/firebase/:firebaseUid - Get user by Firebase UID */
export type TUsersGetByFirebaseUidEndpoint = TEndpointDefinition<
  'GET',
  '/users/firebase/:firebaseUid',
  TApiDataResponse<TUser>,
  void,
  { firebaseUid: string }
>

/** POST /users - Create user */
export type TUsersCreateEndpoint = TEndpointDefinition<
  'POST',
  '/users',
  TApiDataResponse<TUser>,
  TUserCreate
>

/** PATCH /users/:id - Update user */
export type TUsersUpdateEndpoint = TEndpointDefinition<
  'PATCH',
  '/users/:id',
  TApiDataResponse<TUser>,
  TUserUpdate,
  TIdParam
>

/** POST /users/:id/last-login - Update last login */
export type TUsersUpdateLastLoginEndpoint = TEndpointDefinition<
  'POST',
  '/users/:id/last-login',
  TApiDataResponse<TUser>,
  void,
  TIdParam
>

/** DELETE /users/:id - Delete user */
export type TUsersDeleteEndpoint = TEndpointDefinition<'DELETE', '/users/:id', void, void, TIdParam>

// ─────────────────────────────────────────────────────────────────────────────
// Aggregated Users API Types
// ─────────────────────────────────────────────────────────────────────────────

export type TUsersEndpoints = {
  list: TUsersListEndpoint
  getById: TUsersGetByIdEndpoint
  getByEmail: TUsersGetByEmailEndpoint
  getByFirebaseUid: TUsersGetByFirebaseUidEndpoint
  create: TUsersCreateEndpoint
  update: TUsersUpdateEndpoint
  updateLastLogin: TUsersUpdateLastLoginEndpoint
  delete: TUsersDeleteEndpoint
}
