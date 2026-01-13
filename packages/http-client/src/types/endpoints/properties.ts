/**
 * Properties Endpoints Types
 *
 * Type definitions for all property-related API endpoints:
 * - Management Companies
 * - Condominiums
 * - Buildings
 * - Units
 * - Unit Ownerships
 */

import type {
  TManagementCompany,
  TManagementCompanyCreate,
  TManagementCompanyUpdate,
  TCondominium,
  TCondominiumCreate,
  TCondominiumUpdate,
  TBuilding,
  TBuildingCreate,
  TBuildingUpdate,
  TUnit,
  TUnitCreate,
  TUnitUpdate,
  TUnitOwnership,
  TUnitOwnershipCreate,
  TUnitOwnershipUpdate,
} from '@packages/domain'
import type { TEndpointDefinition, TIdParam, TCodeParam } from './base'
import type { TApiDataResponse } from '../api-responses'

// =============================================================================
// Management Companies Endpoints
// =============================================================================

type TTaxIdParam = { taxId: string }
type TLocationIdParam = { locationId: string }

/** GET /management-companies - List all */
export type TManagementCompaniesListEndpoint = TEndpointDefinition<
  'GET',
  '/management-companies',
  TApiDataResponse<TManagementCompany[]>
>

/** GET /management-companies/tax-id/:taxId - Get by tax ID */
export type TManagementCompaniesGetByTaxIdEndpoint = TEndpointDefinition<
  'GET',
  '/management-companies/tax-id/:taxId',
  TApiDataResponse<TManagementCompany>,
  void,
  TTaxIdParam
>

/** GET /management-companies/location/:locationId - Get by location */
export type TManagementCompaniesGetByLocationEndpoint = TEndpointDefinition<
  'GET',
  '/management-companies/location/:locationId',
  TApiDataResponse<TManagementCompany[]>,
  void,
  TLocationIdParam
>

/** GET /management-companies/:id - Get by ID */
export type TManagementCompaniesGetByIdEndpoint = TEndpointDefinition<
  'GET',
  '/management-companies/:id',
  TApiDataResponse<TManagementCompany>,
  void,
  TIdParam
>

/** POST /management-companies - Create */
export type TManagementCompaniesCreateEndpoint = TEndpointDefinition<
  'POST',
  '/management-companies',
  TApiDataResponse<TManagementCompany>,
  TManagementCompanyCreate
>

/** PATCH /management-companies/:id - Update */
export type TManagementCompaniesUpdateEndpoint = TEndpointDefinition<
  'PATCH',
  '/management-companies/:id',
  TApiDataResponse<TManagementCompany>,
  TManagementCompanyUpdate,
  TIdParam
>

/** DELETE /management-companies/:id - Delete */
export type TManagementCompaniesDeleteEndpoint = TEndpointDefinition<
  'DELETE',
  '/management-companies/:id',
  void,
  void,
  TIdParam
>

export type TManagementCompaniesEndpoints = {
  list: TManagementCompaniesListEndpoint
  getByTaxId: TManagementCompaniesGetByTaxIdEndpoint
  getByLocation: TManagementCompaniesGetByLocationEndpoint
  getById: TManagementCompaniesGetByIdEndpoint
  create: TManagementCompaniesCreateEndpoint
  update: TManagementCompaniesUpdateEndpoint
  delete: TManagementCompaniesDeleteEndpoint
}

// =============================================================================
// Condominiums Endpoints
// =============================================================================

type TManagementCompanyIdParam = { managementCompanyId: string }

/** GET /condominiums - List all */
export type TCondominiumsListEndpoint = TEndpointDefinition<
  'GET',
  '/condominiums',
  TApiDataResponse<TCondominium[]>
>

/** GET /condominiums/code/:code - Get by code */
export type TCondominiumsGetByCodeEndpoint = TEndpointDefinition<
  'GET',
  '/condominiums/code/:code',
  TApiDataResponse<TCondominium>,
  void,
  TCodeParam
>

/** GET /condominiums/management-company/:managementCompanyId - Get by management company */
export type TCondominiumsGetByManagementCompanyEndpoint = TEndpointDefinition<
  'GET',
  '/condominiums/management-company/:managementCompanyId',
  TApiDataResponse<TCondominium[]>,
  void,
  TManagementCompanyIdParam
>

/** GET /condominiums/location/:locationId - Get by location */
export type TCondominiumsGetByLocationEndpoint = TEndpointDefinition<
  'GET',
  '/condominiums/location/:locationId',
  TApiDataResponse<TCondominium[]>,
  void,
  TLocationIdParam
>

/** GET /condominiums/:id - Get by ID */
export type TCondominiumsGetByIdEndpoint = TEndpointDefinition<
  'GET',
  '/condominiums/:id',
  TApiDataResponse<TCondominium>,
  void,
  TIdParam
>

/** POST /condominiums - Create */
export type TCondominiumsCreateEndpoint = TEndpointDefinition<
  'POST',
  '/condominiums',
  TApiDataResponse<TCondominium>,
  TCondominiumCreate
>

/** PATCH /condominiums/:id - Update */
export type TCondominiumsUpdateEndpoint = TEndpointDefinition<
  'PATCH',
  '/condominiums/:id',
  TApiDataResponse<TCondominium>,
  TCondominiumUpdate,
  TIdParam
>

/** DELETE /condominiums/:id - Delete */
export type TCondominiumsDeleteEndpoint = TEndpointDefinition<
  'DELETE',
  '/condominiums/:id',
  void,
  void,
  TIdParam
>

export type TCondominiumsEndpoints = {
  list: TCondominiumsListEndpoint
  getByCode: TCondominiumsGetByCodeEndpoint
  getByManagementCompany: TCondominiumsGetByManagementCompanyEndpoint
  getByLocation: TCondominiumsGetByLocationEndpoint
  getById: TCondominiumsGetByIdEndpoint
  create: TCondominiumsCreateEndpoint
  update: TCondominiumsUpdateEndpoint
  delete: TCondominiumsDeleteEndpoint
}

// =============================================================================
// Buildings Endpoints
// =============================================================================

type TCondominiumIdParam = { condominiumId: string }
type TCondominiumAndCodeParam = { condominiumId: string; code: string }

/** GET /buildings - List all */
export type TBuildingsListEndpoint = TEndpointDefinition<
  'GET',
  '/buildings',
  TApiDataResponse<TBuilding[]>
>

/** GET /buildings/condominium/:condominiumId - Get by condominium */
export type TBuildingsGetByCondominiumEndpoint = TEndpointDefinition<
  'GET',
  '/buildings/condominium/:condominiumId',
  TApiDataResponse<TBuilding[]>,
  void,
  TCondominiumIdParam
>

/** GET /buildings/condominium/:condominiumId/code/:code - Get by condominium and code */
export type TBuildingsGetByCondominiumAndCodeEndpoint = TEndpointDefinition<
  'GET',
  '/buildings/condominium/:condominiumId/code/:code',
  TApiDataResponse<TBuilding>,
  void,
  TCondominiumAndCodeParam
>

/** GET /buildings/:id - Get by ID */
export type TBuildingsGetByIdEndpoint = TEndpointDefinition<
  'GET',
  '/buildings/:id',
  TApiDataResponse<TBuilding>,
  void,
  TIdParam
>

/** POST /buildings - Create */
export type TBuildingsCreateEndpoint = TEndpointDefinition<
  'POST',
  '/buildings',
  TApiDataResponse<TBuilding>,
  TBuildingCreate
>

/** PATCH /buildings/:id - Update */
export type TBuildingsUpdateEndpoint = TEndpointDefinition<
  'PATCH',
  '/buildings/:id',
  TApiDataResponse<TBuilding>,
  TBuildingUpdate,
  TIdParam
>

/** DELETE /buildings/:id - Delete */
export type TBuildingsDeleteEndpoint = TEndpointDefinition<
  'DELETE',
  '/buildings/:id',
  void,
  void,
  TIdParam
>

export type TBuildingsEndpoints = {
  list: TBuildingsListEndpoint
  getByCondominium: TBuildingsGetByCondominiumEndpoint
  getByCondominiumAndCode: TBuildingsGetByCondominiumAndCodeEndpoint
  getById: TBuildingsGetByIdEndpoint
  create: TBuildingsCreateEndpoint
  update: TBuildingsUpdateEndpoint
  delete: TBuildingsDeleteEndpoint
}

// =============================================================================
// Units Endpoints
// =============================================================================

type TBuildingIdParam = { buildingId: string }
type TBuildingAndNumberParam = { buildingId: string; unitNumber: string }
type TBuildingAndFloorParam = { buildingId: string; floor: number }

/** GET /units - List all */
export type TUnitsListEndpoint = TEndpointDefinition<'GET', '/units', TApiDataResponse<TUnit[]>>

/** GET /units/building/:buildingId - Get by building */
export type TUnitsGetByBuildingEndpoint = TEndpointDefinition<
  'GET',
  '/units/building/:buildingId',
  TApiDataResponse<TUnit[]>,
  void,
  TBuildingIdParam
>

/** GET /units/building/:buildingId/number/:unitNumber - Get by building and number */
export type TUnitsGetByBuildingAndNumberEndpoint = TEndpointDefinition<
  'GET',
  '/units/building/:buildingId/number/:unitNumber',
  TApiDataResponse<TUnit>,
  void,
  TBuildingAndNumberParam
>

/** GET /units/building/:buildingId/floor/:floor - Get by building and floor */
export type TUnitsGetByBuildingAndFloorEndpoint = TEndpointDefinition<
  'GET',
  '/units/building/:buildingId/floor/:floor',
  TApiDataResponse<TUnit[]>,
  void,
  TBuildingAndFloorParam
>

/** GET /units/:id - Get by ID */
export type TUnitsGetByIdEndpoint = TEndpointDefinition<
  'GET',
  '/units/:id',
  TApiDataResponse<TUnit>,
  void,
  TIdParam
>

/** POST /units - Create */
export type TUnitsCreateEndpoint = TEndpointDefinition<
  'POST',
  '/units',
  TApiDataResponse<TUnit>,
  TUnitCreate
>

/** PATCH /units/:id - Update */
export type TUnitsUpdateEndpoint = TEndpointDefinition<
  'PATCH',
  '/units/:id',
  TApiDataResponse<TUnit>,
  TUnitUpdate,
  TIdParam
>

/** DELETE /units/:id - Delete */
export type TUnitsDeleteEndpoint = TEndpointDefinition<'DELETE', '/units/:id', void, void, TIdParam>

export type TUnitsEndpoints = {
  list: TUnitsListEndpoint
  getByBuilding: TUnitsGetByBuildingEndpoint
  getByBuildingAndNumber: TUnitsGetByBuildingAndNumberEndpoint
  getByBuildingAndFloor: TUnitsGetByBuildingAndFloorEndpoint
  getById: TUnitsGetByIdEndpoint
  create: TUnitsCreateEndpoint
  update: TUnitsUpdateEndpoint
  delete: TUnitsDeleteEndpoint
}

// =============================================================================
// Unit Ownerships Endpoints
// =============================================================================

type TUnitIdParam = { unitId: string }
type TUserIdParam = { userId: string }
type TUnitAndUserParam = { unitId: string; userId: string }

/** GET /unit-ownerships - List all */
export type TUnitOwnershipsListEndpoint = TEndpointDefinition<
  'GET',
  '/unit-ownerships',
  TApiDataResponse<TUnitOwnership[]>
>

/** GET /unit-ownerships/unit/:unitId - Get by unit */
export type TUnitOwnershipsGetByUnitEndpoint = TEndpointDefinition<
  'GET',
  '/unit-ownerships/unit/:unitId',
  TApiDataResponse<TUnitOwnership[]>,
  void,
  TUnitIdParam
>

/** GET /unit-ownerships/user/:userId - Get by user */
export type TUnitOwnershipsGetByUserEndpoint = TEndpointDefinition<
  'GET',
  '/unit-ownerships/user/:userId',
  TApiDataResponse<TUnitOwnership[]>,
  void,
  TUserIdParam
>

/** GET /unit-ownerships/user/:userId/primary - Get primary residence */
export type TUnitOwnershipsGetPrimaryResidenceEndpoint = TEndpointDefinition<
  'GET',
  '/unit-ownerships/user/:userId/primary',
  TApiDataResponse<TUnitOwnership>,
  void,
  TUserIdParam
>

/** GET /unit-ownerships/unit/:unitId/user/:userId - Get by unit and user */
export type TUnitOwnershipsGetByUnitAndUserEndpoint = TEndpointDefinition<
  'GET',
  '/unit-ownerships/unit/:unitId/user/:userId',
  TApiDataResponse<TUnitOwnership>,
  void,
  TUnitAndUserParam
>

/** GET /unit-ownerships/:id - Get by ID */
export type TUnitOwnershipsGetByIdEndpoint = TEndpointDefinition<
  'GET',
  '/unit-ownerships/:id',
  TApiDataResponse<TUnitOwnership>,
  void,
  TIdParam
>

/** POST /unit-ownerships - Create */
export type TUnitOwnershipsCreateEndpoint = TEndpointDefinition<
  'POST',
  '/unit-ownerships',
  TApiDataResponse<TUnitOwnership>,
  TUnitOwnershipCreate
>

/** PATCH /unit-ownerships/:id - Update */
export type TUnitOwnershipsUpdateEndpoint = TEndpointDefinition<
  'PATCH',
  '/unit-ownerships/:id',
  TApiDataResponse<TUnitOwnership>,
  TUnitOwnershipUpdate,
  TIdParam
>

/** DELETE /unit-ownerships/:id - Delete */
export type TUnitOwnershipsDeleteEndpoint = TEndpointDefinition<
  'DELETE',
  '/unit-ownerships/:id',
  void,
  void,
  TIdParam
>

export type TUnitOwnershipsEndpoints = {
  list: TUnitOwnershipsListEndpoint
  getByUnit: TUnitOwnershipsGetByUnitEndpoint
  getByUser: TUnitOwnershipsGetByUserEndpoint
  getPrimaryResidence: TUnitOwnershipsGetPrimaryResidenceEndpoint
  getByUnitAndUser: TUnitOwnershipsGetByUnitAndUserEndpoint
  getById: TUnitOwnershipsGetByIdEndpoint
  create: TUnitOwnershipsCreateEndpoint
  update: TUnitOwnershipsUpdateEndpoint
  delete: TUnitOwnershipsDeleteEndpoint
}
