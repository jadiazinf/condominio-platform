/**
 * Endpoint Types Index
 *
 * Exports all endpoint type definitions for type-safe API communication.
 */

// Base types
export type {
  THttpMethod,
  TEndpointDefinition,
  TExtractResponse,
  TExtractBody,
  TExtractParams,
  TExtractQuery,
  TIdParam,
  TCodeParam,
  TEmailParam,
  TNameParam,
} from './base'

// Users & Authentication
export * from './users'
export * from './roles'
export * from './permissions'
export * from './role-permissions'
export * from './user-roles'

// Locations & Currencies
export * from './locations'
export * from './currencies'

// Properties
export * from './properties'

// Payments & Billing
export * from './payments'
export * from './payment-gateways'
export * from './payment-concepts'
export * from './payment-applications'
export * from './payment-pending-allocations'

// Currencies & Exchange Rates
export * from './exchange-rates'

// Quotas
export * from './quotas'

// Interest Configurations
export * from './interest-configurations'

// Expenses
export * from './expenses'

// Communication
export * from './communication'

// Notifications
export * from './notifications'

// Audit & Health
export * from './audit'
