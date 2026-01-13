/**
 * Quotas Endpoints Types
 *
 * Type definitions for quota-related API endpoints:
 * - Quotas
 * - Quota Adjustments
 * - Quota Formulas
 * - Quota Generation Rules
 */

import type {
  TQuota,
  TQuotaCreate,
  TQuotaUpdate,
  TQuotaAdjustment,
  TQuotaFormula,
  TQuotaGenerationRule,
} from '@packages/domain'
import { EAdjustmentTypes, EFormulaTypes } from '@packages/domain'
import type { TEndpointDefinition, TIdParam } from './base'
import type { TApiDataResponse, TApiDataMessageResponse } from '../api-responses'

// =============================================================================
// Quotas Endpoints
// =============================================================================

type TUnitIdParam = { unitId: string }
type TStatusParam = { status: 'pending' | 'paid' | 'overdue' | 'cancelled' }
type TDateParam = { date: string }
type TPeriodQuery = { year: number; month?: number }

/** GET /quotas - List all */
export type TQuotasListEndpoint = TEndpointDefinition<'GET', '/quotas', TApiDataResponse<TQuota[]>>

/** GET /quotas/unit/:unitId - Get by unit */
export type TQuotasGetByUnitEndpoint = TEndpointDefinition<
  'GET',
  '/quotas/unit/:unitId',
  TApiDataResponse<TQuota[]>,
  void,
  TUnitIdParam
>

/** GET /quotas/unit/:unitId/pending - Get pending by unit */
export type TQuotasGetPendingByUnitEndpoint = TEndpointDefinition<
  'GET',
  '/quotas/unit/:unitId/pending',
  TApiDataResponse<TQuota[]>,
  void,
  TUnitIdParam
>

/** GET /quotas/status/:status - Get by status */
export type TQuotasGetByStatusEndpoint = TEndpointDefinition<
  'GET',
  '/quotas/status/:status',
  TApiDataResponse<TQuota[]>,
  void,
  TStatusParam
>

/** GET /quotas/overdue/:date - Get overdue as of date */
export type TQuotasGetOverdueEndpoint = TEndpointDefinition<
  'GET',
  '/quotas/overdue/:date',
  TApiDataResponse<TQuota[]>,
  void,
  TDateParam
>

/** GET /quotas/period - Get by period */
export type TQuotasGetByPeriodEndpoint = TEndpointDefinition<
  'GET',
  '/quotas/period',
  TApiDataResponse<TQuota[]>,
  void,
  void,
  TPeriodQuery
>

/** GET /quotas/:id - Get by ID */
export type TQuotasGetByIdEndpoint = TEndpointDefinition<
  'GET',
  '/quotas/:id',
  TApiDataResponse<TQuota>,
  void,
  TIdParam
>

/** POST /quotas - Create */
export type TQuotasCreateEndpoint = TEndpointDefinition<
  'POST',
  '/quotas',
  TApiDataResponse<TQuota>,
  TQuotaCreate
>

/** PATCH /quotas/:id - Update */
export type TQuotasUpdateEndpoint = TEndpointDefinition<
  'PATCH',
  '/quotas/:id',
  TApiDataResponse<TQuota>,
  TQuotaUpdate,
  TIdParam
>

/** DELETE /quotas/:id - Cancel quota */
export type TQuotasDeleteEndpoint = TEndpointDefinition<
  'DELETE',
  '/quotas/:id',
  void,
  void,
  TIdParam
>

export type TQuotasEndpoints = {
  list: TQuotasListEndpoint
  getByUnit: TQuotasGetByUnitEndpoint
  getPendingByUnit: TQuotasGetPendingByUnitEndpoint
  getByStatus: TQuotasGetByStatusEndpoint
  getOverdue: TQuotasGetOverdueEndpoint
  getByPeriod: TQuotasGetByPeriodEndpoint
  getById: TQuotasGetByIdEndpoint
  create: TQuotasCreateEndpoint
  update: TQuotasUpdateEndpoint
  delete: TQuotasDeleteEndpoint
}

// =============================================================================
// Quota Adjustments Endpoints
// =============================================================================

// Adjustment type
type TAdjustmentType = (typeof EAdjustmentTypes)[number]

type TQuotaIdParam = { quotaId: string }
type TUserIdParam = { userId: string }
type TAdjustmentTypeParam = { type: TAdjustmentType }

// Adjust quota body
type TAdjustQuotaBody = {
  newAmount: string
  adjustmentType: TAdjustmentType
  reason: string
}

// Adjust quota response
type TAdjustQuotaResponseData = {
  adjustment: TQuotaAdjustment
  message: string
}

/** GET /quota-adjustments - List all */
export type TQuotaAdjustmentsListEndpoint = TEndpointDefinition<
  'GET',
  '/quota-adjustments',
  TApiDataResponse<TQuotaAdjustment[]>
>

/** GET /quota-adjustments/quota/:quotaId - Get by quota */
export type TQuotaAdjustmentsGetByQuotaEndpoint = TEndpointDefinition<
  'GET',
  '/quota-adjustments/quota/:quotaId',
  TApiDataResponse<TQuotaAdjustment[]>,
  void,
  TQuotaIdParam
>

/** GET /quota-adjustments/user/:userId - Get by user */
export type TQuotaAdjustmentsGetByUserEndpoint = TEndpointDefinition<
  'GET',
  '/quota-adjustments/user/:userId',
  TApiDataResponse<TQuotaAdjustment[]>,
  void,
  TUserIdParam
>

/** GET /quota-adjustments/type/:type - Get by type */
export type TQuotaAdjustmentsGetByTypeEndpoint = TEndpointDefinition<
  'GET',
  '/quota-adjustments/type/:type',
  TApiDataResponse<TQuotaAdjustment[]>,
  void,
  TAdjustmentTypeParam
>

/** GET /quota-adjustments/:id - Get by ID */
export type TQuotaAdjustmentsGetByIdEndpoint = TEndpointDefinition<
  'GET',
  '/quota-adjustments/:id',
  TApiDataResponse<TQuotaAdjustment>,
  void,
  TIdParam
>

/** POST /quota-adjustments/quota/:quotaId - Adjust quota */
export type TQuotaAdjustmentsAdjustEndpoint = TEndpointDefinition<
  'POST',
  '/quota-adjustments/quota/:quotaId',
  TApiDataMessageResponse<TQuotaAdjustment>,
  TAdjustQuotaBody,
  TQuotaIdParam
>

export type TQuotaAdjustmentsEndpoints = {
  list: TQuotaAdjustmentsListEndpoint
  getByQuota: TQuotaAdjustmentsGetByQuotaEndpoint
  getByUser: TQuotaAdjustmentsGetByUserEndpoint
  getByType: TQuotaAdjustmentsGetByTypeEndpoint
  getById: TQuotaAdjustmentsGetByIdEndpoint
  adjust: TQuotaAdjustmentsAdjustEndpoint
}

// =============================================================================
// Quota Formulas Endpoints
// =============================================================================

// Formula type
type TFormulaType = (typeof EFormulaTypes)[number]

type TCondominiumIdParam = { condominiumId: string }
type TIncludeInactiveQuery = { includeInactive?: boolean }

// Create quota formula body
type TCreateQuotaFormulaBody = {
  condominiumId: string
  name: string
  description?: string | null
  formulaType: TFormulaType
  fixedAmount?: string | null
  expression?: string | null
  variables?: Record<string, unknown> | null
  unitAmounts?: Record<string, unknown> | null
  currencyId: string
}

// Update quota formula body
type TUpdateQuotaFormulaBody = {
  name?: string
  description?: string | null
  formulaType?: TFormulaType
  fixedAmount?: string | null
  expression?: string | null
  variables?: Record<string, unknown> | null
  unitAmounts?: Record<string, unknown> | null
  currencyId?: string
  isActive?: boolean
  updateReason?: string | null
}

// Calculate amount body
type TCalculateAmountBody = {
  unitId: string
  additionalVariables?: Record<string, number>
}

// Calculate amount response
type TCalculateAmountData = {
  amount: string
  currencyId: string
  formulaType: TFormulaType
}

/** GET /quota-formulas - List all */
export type TQuotaFormulasListEndpoint = TEndpointDefinition<
  'GET',
  '/quota-formulas',
  TApiDataResponse<TQuotaFormula[]>,
  void,
  void,
  TIncludeInactiveQuery
>

/** GET /quota-formulas/condominium/:condominiumId - Get by condominium */
export type TQuotaFormulasGetByCondominiumEndpoint = TEndpointDefinition<
  'GET',
  '/quota-formulas/condominium/:condominiumId',
  TApiDataResponse<TQuotaFormula[]>,
  void,
  TCondominiumIdParam,
  TIncludeInactiveQuery
>

/** GET /quota-formulas/:id - Get by ID */
export type TQuotaFormulasGetByIdEndpoint = TEndpointDefinition<
  'GET',
  '/quota-formulas/:id',
  TApiDataResponse<TQuotaFormula>,
  void,
  TIdParam
>

/** POST /quota-formulas - Create */
export type TQuotaFormulasCreateEndpoint = TEndpointDefinition<
  'POST',
  '/quota-formulas',
  TApiDataMessageResponse<TQuotaFormula>,
  TCreateQuotaFormulaBody
>

/** PUT /quota-formulas/:id - Update */
export type TQuotaFormulasUpdateEndpoint = TEndpointDefinition<
  'PUT',
  '/quota-formulas/:id',
  TApiDataMessageResponse<TQuotaFormula>,
  TUpdateQuotaFormulaBody,
  TIdParam
>

/** DELETE /quota-formulas/:id - Delete (soft) */
export type TQuotaFormulasDeleteEndpoint = TEndpointDefinition<
  'DELETE',
  '/quota-formulas/:id',
  void,
  void,
  TIdParam
>

/** POST /quota-formulas/:id/calculate - Calculate amount */
export type TQuotaFormulasCalculateEndpoint = TEndpointDefinition<
  'POST',
  '/quota-formulas/:id/calculate',
  TApiDataResponse<TCalculateAmountData>,
  TCalculateAmountBody,
  TIdParam
>

export type TQuotaFormulasEndpoints = {
  list: TQuotaFormulasListEndpoint
  getByCondominium: TQuotaFormulasGetByCondominiumEndpoint
  getById: TQuotaFormulasGetByIdEndpoint
  create: TQuotaFormulasCreateEndpoint
  update: TQuotaFormulasUpdateEndpoint
  delete: TQuotaFormulasDeleteEndpoint
  calculate: TQuotaFormulasCalculateEndpoint
}

// =============================================================================
// Quota Generation Rules Endpoints
// =============================================================================

// Create quota generation rule body
type TCreateQuotaGenerationRuleBody = {
  condominiumId: string
  buildingId?: string | null
  paymentConceptId: string
  quotaFormulaId: string
  name: string
  description?: string | null
  effectiveFrom: string
  effectiveTo?: string | null
}

// Update quota generation rule body
type TUpdateQuotaGenerationRuleBody = {
  buildingId?: string | null
  paymentConceptId?: string
  quotaFormulaId?: string
  name?: string
  description?: string | null
  effectiveFrom?: string
  effectiveTo?: string | null
  isActive?: boolean
  updateReason?: string | null
}

// Get applicable rule query
type TGetApplicableRuleQuery = {
  paymentConceptId: string
  targetDate: string
  buildingId?: string
}

// Get effective rules query
type TGetEffectiveRulesQuery = {
  targetDate: string
}

/** GET /quota-generation-rules - List all */
export type TQuotaGenerationRulesListEndpoint = TEndpointDefinition<
  'GET',
  '/quota-generation-rules',
  TApiDataResponse<TQuotaGenerationRule[]>,
  void,
  void,
  TIncludeInactiveQuery
>

/** GET /quota-generation-rules/condominium/:condominiumId - Get by condominium */
export type TQuotaGenerationRulesGetByCondominiumEndpoint = TEndpointDefinition<
  'GET',
  '/quota-generation-rules/condominium/:condominiumId',
  TApiDataResponse<TQuotaGenerationRule[]>,
  void,
  TCondominiumIdParam,
  TIncludeInactiveQuery
>

/** GET /quota-generation-rules/condominium/:condominiumId/applicable - Get applicable rule */
export type TQuotaGenerationRulesGetApplicableEndpoint = TEndpointDefinition<
  'GET',
  '/quota-generation-rules/condominium/:condominiumId/applicable',
  TApiDataResponse<TQuotaGenerationRule>,
  void,
  TCondominiumIdParam,
  TGetApplicableRuleQuery
>

/** GET /quota-generation-rules/condominium/:condominiumId/effective - Get effective rules */
export type TQuotaGenerationRulesGetEffectiveEndpoint = TEndpointDefinition<
  'GET',
  '/quota-generation-rules/condominium/:condominiumId/effective',
  TApiDataResponse<TQuotaGenerationRule[]>,
  void,
  TCondominiumIdParam,
  TGetEffectiveRulesQuery
>

/** GET /quota-generation-rules/:id - Get by ID */
export type TQuotaGenerationRulesGetByIdEndpoint = TEndpointDefinition<
  'GET',
  '/quota-generation-rules/:id',
  TApiDataResponse<TQuotaGenerationRule>,
  void,
  TIdParam
>

/** POST /quota-generation-rules - Create */
export type TQuotaGenerationRulesCreateEndpoint = TEndpointDefinition<
  'POST',
  '/quota-generation-rules',
  TApiDataMessageResponse<TQuotaGenerationRule>,
  TCreateQuotaGenerationRuleBody
>

/** PUT /quota-generation-rules/:id - Update */
export type TQuotaGenerationRulesUpdateEndpoint = TEndpointDefinition<
  'PUT',
  '/quota-generation-rules/:id',
  TApiDataMessageResponse<TQuotaGenerationRule>,
  TUpdateQuotaGenerationRuleBody,
  TIdParam
>

/** DELETE /quota-generation-rules/:id - Delete (soft) */
export type TQuotaGenerationRulesDeleteEndpoint = TEndpointDefinition<
  'DELETE',
  '/quota-generation-rules/:id',
  void,
  void,
  TIdParam
>

export type TQuotaGenerationRulesEndpoints = {
  list: TQuotaGenerationRulesListEndpoint
  getByCondominium: TQuotaGenerationRulesGetByCondominiumEndpoint
  getApplicable: TQuotaGenerationRulesGetApplicableEndpoint
  getEffective: TQuotaGenerationRulesGetEffectiveEndpoint
  getById: TQuotaGenerationRulesGetByIdEndpoint
  create: TQuotaGenerationRulesCreateEndpoint
  update: TQuotaGenerationRulesUpdateEndpoint
  delete: TQuotaGenerationRulesDeleteEndpoint
}
