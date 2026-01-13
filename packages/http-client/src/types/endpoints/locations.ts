/**
 * Locations Endpoints Types
 *
 * Type definitions for all location-related API endpoints.
 */

import type { TLocation, TLocationCreate, TLocationUpdate, TLocationType } from '@packages/domain'
import type { TEndpointDefinition, TIdParam } from './base'
import type { TApiDataResponse } from '../api-responses'

// Custom param types
type TLocationTypeParam = { type: TLocationType }
type TParentIdParam = { parentId: string }

// ─────────────────────────────────────────────────────────────────────────────
// Locations Endpoints
// ─────────────────────────────────────────────────────────────────────────────

/** GET /locations - List all locations */
export type TLocationsListEndpoint = TEndpointDefinition<
  'GET',
  '/locations',
  TApiDataResponse<TLocation[]>
>

/** GET /locations/type/:type - Get locations by type */
export type TLocationsGetByTypeEndpoint = TEndpointDefinition<
  'GET',
  '/locations/type/:type',
  TApiDataResponse<TLocation[]>,
  void,
  TLocationTypeParam
>

/** GET /locations/parent/:parentId - Get locations by parent ID */
export type TLocationsGetByParentIdEndpoint = TEndpointDefinition<
  'GET',
  '/locations/parent/:parentId',
  TApiDataResponse<TLocation[]>,
  void,
  TParentIdParam
>

/** GET /locations/:id - Get location by ID */
export type TLocationsGetByIdEndpoint = TEndpointDefinition<
  'GET',
  '/locations/:id',
  TApiDataResponse<TLocation>,
  void,
  TIdParam
>

/** POST /locations - Create location */
export type TLocationsCreateEndpoint = TEndpointDefinition<
  'POST',
  '/locations',
  TApiDataResponse<TLocation>,
  TLocationCreate
>

/** PATCH /locations/:id - Update location */
export type TLocationsUpdateEndpoint = TEndpointDefinition<
  'PATCH',
  '/locations/:id',
  TApiDataResponse<TLocation>,
  TLocationUpdate,
  TIdParam
>

/** DELETE /locations/:id - Delete location */
export type TLocationsDeleteEndpoint = TEndpointDefinition<
  'DELETE',
  '/locations/:id',
  void,
  void,
  TIdParam
>

// ─────────────────────────────────────────────────────────────────────────────
// Aggregated Locations API Types
// ─────────────────────────────────────────────────────────────────────────────

export type TLocationsEndpoints = {
  list: TLocationsListEndpoint
  getByType: TLocationsGetByTypeEndpoint
  getByParentId: TLocationsGetByParentIdEndpoint
  getById: TLocationsGetByIdEndpoint
  create: TLocationsCreateEndpoint
  update: TLocationsUpdateEndpoint
  delete: TLocationsDeleteEndpoint
}
