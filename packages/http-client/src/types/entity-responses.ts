/**
 * Entity-specific API Response Types
 *
 * These types provide strong typing for API responses based on domain entities.
 * Use these in both the API (server) and client apps for type safety.
 */

import type {
  // Users & Authentication
  TUser,
  TRole,
  TPermission,
  TRolePermission,
  TUserRole,
  // Locations
  TLocation,
  TCurrency,
  // Properties
  TManagementCompany,
  TCondominium,
  TBuilding,
  TUnit,
  TUnitOwnership,
  // Payments
  TPaymentConcept,
  TQuota,
  TQuotaAdjustment,
  TQuotaFormula,
  TQuotaGenerationRule,
  TPayment,
  TPaymentApplication,
  TPaymentPendingAllocation,
  TPaymentGateway,
  TEntityPaymentGateway,
  TInterestConfiguration,
  // Expenses
  TExpense,
  TExpenseCategory,
  TExchangeRate,
  // Communication
  TDocument,
  TMessage,
  // Notifications
  TNotificationTemplate,
  TNotification,
  TUserNotificationPreference,
  TUserFcmToken,
  // Audit
  TAuditLog,
} from '@packages/domain'

import type { TApiDataResponse, TApiDataMessageResponse } from './api-responses'

// =============================================================================
// Generic Response Helpers
// =============================================================================

/** List response for any entity */
export type TEntityListResponse<T> = TApiDataResponse<T[]>

/** Single entity response */
export type TEntityResponse<T> = TApiDataResponse<T>

/** Created entity response (may include message) */
export type TEntityCreatedResponse<T> = TApiDataResponse<T> | TApiDataMessageResponse<T>

// =============================================================================
// Users & Authentication
// =============================================================================

export type TUserListResponse = TApiDataResponse<TUser[]>
export type TUserResponse = TApiDataResponse<TUser>
export type TUserCreatedResponse = TApiDataResponse<TUser>
export type TUserUpdatedResponse = TApiDataResponse<TUser>

export type TRoleListResponse = TApiDataResponse<TRole[]>
export type TRoleResponse = TApiDataResponse<TRole>
export type TRoleCreatedResponse = TApiDataResponse<TRole>
export type TRoleUpdatedResponse = TApiDataResponse<TRole>

export type TPermissionListResponse = TApiDataResponse<TPermission[]>
export type TPermissionResponse = TApiDataResponse<TPermission>
export type TPermissionCreatedResponse = TApiDataResponse<TPermission>
export type TPermissionUpdatedResponse = TApiDataResponse<TPermission>

export type TRolePermissionListResponse = TApiDataResponse<TRolePermission[]>
export type TRolePermissionResponse = TApiDataResponse<TRolePermission>
export type TRolePermissionCreatedResponse = TApiDataResponse<TRolePermission>

export type TUserRoleListResponse = TApiDataResponse<TUserRole[]>
export type TUserRoleResponse = TApiDataResponse<TUserRole>
export type TUserRoleCreatedResponse = TApiDataResponse<TUserRole>

// =============================================================================
// Locations & Currencies
// =============================================================================

export type TLocationListResponse = TApiDataResponse<TLocation[]>
export type TLocationResponse = TApiDataResponse<TLocation>
export type TLocationCreatedResponse = TApiDataResponse<TLocation>
export type TLocationUpdatedResponse = TApiDataResponse<TLocation>

export type TCurrencyListResponse = TApiDataResponse<TCurrency[]>
export type TCurrencyResponse = TApiDataResponse<TCurrency>
export type TCurrencyCreatedResponse = TApiDataResponse<TCurrency>
export type TCurrencyUpdatedResponse = TApiDataResponse<TCurrency>

// =============================================================================
// Properties
// =============================================================================

export type TManagementCompanyListResponse = TApiDataResponse<TManagementCompany[]>
export type TManagementCompanyResponse = TApiDataResponse<TManagementCompany>
export type TManagementCompanyCreatedResponse = TApiDataResponse<TManagementCompany>
export type TManagementCompanyUpdatedResponse = TApiDataResponse<TManagementCompany>

export type TCondominiumListResponse = TApiDataResponse<TCondominium[]>
export type TCondominiumResponse = TApiDataResponse<TCondominium>
export type TCondominiumCreatedResponse = TApiDataResponse<TCondominium>
export type TCondominiumUpdatedResponse = TApiDataResponse<TCondominium>

export type TBuildingListResponse = TApiDataResponse<TBuilding[]>
export type TBuildingResponse = TApiDataResponse<TBuilding>
export type TBuildingCreatedResponse = TApiDataResponse<TBuilding>
export type TBuildingUpdatedResponse = TApiDataResponse<TBuilding>

export type TUnitListResponse = TApiDataResponse<TUnit[]>
export type TUnitResponse = TApiDataResponse<TUnit>
export type TUnitCreatedResponse = TApiDataResponse<TUnit>
export type TUnitUpdatedResponse = TApiDataResponse<TUnit>

export type TUnitOwnershipListResponse = TApiDataResponse<TUnitOwnership[]>
export type TUnitOwnershipResponse = TApiDataResponse<TUnitOwnership>
export type TUnitOwnershipCreatedResponse = TApiDataResponse<TUnitOwnership>
export type TUnitOwnershipUpdatedResponse = TApiDataResponse<TUnitOwnership>

// =============================================================================
// Payments & Billing
// =============================================================================

export type TPaymentConceptListResponse = TApiDataResponse<TPaymentConcept[]>
export type TPaymentConceptResponse = TApiDataResponse<TPaymentConcept>
export type TPaymentConceptCreatedResponse = TApiDataResponse<TPaymentConcept>
export type TPaymentConceptUpdatedResponse = TApiDataResponse<TPaymentConcept>

export type TQuotaListResponse = TApiDataResponse<TQuota[]>
export type TQuotaResponse = TApiDataResponse<TQuota>
export type TQuotaCreatedResponse = TApiDataResponse<TQuota>
export type TQuotaUpdatedResponse = TApiDataResponse<TQuota>

export type TQuotaAdjustmentListResponse = TApiDataResponse<TQuotaAdjustment[]>
export type TQuotaAdjustmentResponse = TApiDataResponse<TQuotaAdjustment>
export type TQuotaAdjustmentCreatedResponse = TApiDataResponse<TQuotaAdjustment>

export type TQuotaFormulaListResponse = TApiDataResponse<TQuotaFormula[]>
export type TQuotaFormulaResponse = TApiDataResponse<TQuotaFormula>
export type TQuotaFormulaCreatedResponse = TApiDataResponse<TQuotaFormula>
export type TQuotaFormulaUpdatedResponse = TApiDataResponse<TQuotaFormula>

export type TQuotaGenerationRuleListResponse = TApiDataResponse<TQuotaGenerationRule[]>
export type TQuotaGenerationRuleResponse = TApiDataResponse<TQuotaGenerationRule>
export type TQuotaGenerationRuleCreatedResponse = TApiDataMessageResponse<TQuotaGenerationRule>
export type TQuotaGenerationRuleUpdatedResponse = TApiDataResponse<TQuotaGenerationRule>

export type TPaymentListResponse = TApiDataResponse<TPayment[]>
export type TPaymentResponse = TApiDataResponse<TPayment>
export type TPaymentCreatedResponse = TApiDataResponse<TPayment>
export type TPaymentUpdatedResponse = TApiDataResponse<TPayment>
export type TPaymentVerifiedResponse = TApiDataMessageResponse<TPayment>

export type TPaymentApplicationListResponse = TApiDataResponse<TPaymentApplication[]>
export type TPaymentApplicationResponse = TApiDataResponse<TPaymentApplication>
export type TPaymentApplicationCreatedResponse = TApiDataResponse<TPaymentApplication>

export type TPaymentPendingAllocationListResponse = TApiDataResponse<TPaymentPendingAllocation[]>
export type TPaymentPendingAllocationResponse = TApiDataResponse<TPaymentPendingAllocation>
export type TPaymentPendingAllocationCreatedResponse = TApiDataResponse<TPaymentPendingAllocation>

export type TPaymentGatewayListResponse = TApiDataResponse<TPaymentGateway[]>
export type TPaymentGatewayResponse = TApiDataResponse<TPaymentGateway>
export type TPaymentGatewayCreatedResponse = TApiDataResponse<TPaymentGateway>
export type TPaymentGatewayUpdatedResponse = TApiDataResponse<TPaymentGateway>

export type TEntityPaymentGatewayListResponse = TApiDataResponse<TEntityPaymentGateway[]>
export type TEntityPaymentGatewayResponse = TApiDataResponse<TEntityPaymentGateway>
export type TEntityPaymentGatewayCreatedResponse = TApiDataResponse<TEntityPaymentGateway>
export type TEntityPaymentGatewayUpdatedResponse = TApiDataResponse<TEntityPaymentGateway>

export type TInterestConfigurationListResponse = TApiDataResponse<TInterestConfiguration[]>
export type TInterestConfigurationResponse = TApiDataResponse<TInterestConfiguration>
export type TInterestConfigurationCreatedResponse = TApiDataResponse<TInterestConfiguration>
export type TInterestConfigurationUpdatedResponse = TApiDataResponse<TInterestConfiguration>

// =============================================================================
// Expenses
// =============================================================================

export type TExpenseListResponse = TApiDataResponse<TExpense[]>
export type TExpenseResponse = TApiDataResponse<TExpense>
export type TExpenseCreatedResponse = TApiDataResponse<TExpense>
export type TExpenseUpdatedResponse = TApiDataResponse<TExpense>

export type TExpenseCategoryListResponse = TApiDataResponse<TExpenseCategory[]>
export type TExpenseCategoryResponse = TApiDataResponse<TExpenseCategory>
export type TExpenseCategoryCreatedResponse = TApiDataResponse<TExpenseCategory>
export type TExpenseCategoryUpdatedResponse = TApiDataResponse<TExpenseCategory>

export type TExchangeRateListResponse = TApiDataResponse<TExchangeRate[]>
export type TExchangeRateResponse = TApiDataResponse<TExchangeRate>
export type TExchangeRateCreatedResponse = TApiDataResponse<TExchangeRate>
export type TExchangeRateUpdatedResponse = TApiDataResponse<TExchangeRate>

// =============================================================================
// Communication
// =============================================================================

export type TDocumentListResponse = TApiDataResponse<TDocument[]>
export type TDocumentResponse = TApiDataResponse<TDocument>
export type TDocumentCreatedResponse = TApiDataResponse<TDocument>
export type TDocumentUpdatedResponse = TApiDataResponse<TDocument>

export type TMessageListResponse = TApiDataResponse<TMessage[]>
export type TMessageResponse = TApiDataResponse<TMessage>
export type TMessageCreatedResponse = TApiDataResponse<TMessage>
export type TMessageUpdatedResponse = TApiDataResponse<TMessage>

// =============================================================================
// Notifications
// =============================================================================

export type TNotificationTemplateListResponse = TApiDataResponse<TNotificationTemplate[]>
export type TNotificationTemplateResponse = TApiDataResponse<TNotificationTemplate>
export type TNotificationTemplateCreatedResponse = TApiDataResponse<TNotificationTemplate>
export type TNotificationTemplateUpdatedResponse = TApiDataResponse<TNotificationTemplate>

export type TNotificationListResponse = TApiDataResponse<TNotification[]>
export type TNotificationResponse = TApiDataResponse<TNotification>
export type TNotificationCreatedResponse = TApiDataResponse<TNotification>
export type TNotificationUpdatedResponse = TApiDataResponse<TNotification>

export type TUserNotificationPreferenceListResponse = TApiDataResponse<
  TUserNotificationPreference[]
>
export type TUserNotificationPreferenceResponse = TApiDataResponse<TUserNotificationPreference>
export type TUserNotificationPreferenceCreatedResponse =
  TApiDataResponse<TUserNotificationPreference>
export type TUserNotificationPreferenceUpdatedResponse =
  TApiDataResponse<TUserNotificationPreference>

export type TUserFcmTokenListResponse = TApiDataResponse<TUserFcmToken[]>
export type TUserFcmTokenResponse = TApiDataResponse<TUserFcmToken>
export type TUserFcmTokenCreatedResponse = TApiDataResponse<TUserFcmToken> & { isNew?: boolean }
export type TUserFcmTokenUpdatedResponse = TApiDataResponse<TUserFcmToken>

// =============================================================================
// Audit
// =============================================================================

export type TAuditLogListResponse = TApiDataResponse<TAuditLog[]>
export type TAuditLogResponse = TApiDataResponse<TAuditLog>

// =============================================================================
// Health Check
// =============================================================================

export type THealthCheckData = {
  status: 'ok'
  timestamp: string
  uptime: number
}

export type THealthCheckResponse = TApiDataResponse<THealthCheckData>
