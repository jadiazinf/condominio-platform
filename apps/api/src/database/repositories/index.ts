// Interfaces
export type {
  IRepository,
  IRepositoryWithHardDelete,
  IReadOnlyRepository,
  TDrizzleClient,
  IDatabaseClient,
} from './interfaces'

// Base
export { BaseRepository } from './base'

// Repositories
export { LocationsRepository } from './locations.repository'
export { CurrenciesRepository } from './currencies.repository'
export { ExchangeRatesRepository } from './exchange-rates.repository'
export { UsersRepository } from './users.repository'
export { PermissionsRepository } from './permissions.repository'
export { RolesRepository } from './roles.repository'
export { RolePermissionsRepository } from './role-permissions.repository'
export { ManagementCompaniesRepository } from './management-companies.repository'
export { CondominiumsRepository } from './condominiums.repository'
export { BuildingsRepository } from './buildings.repository'
export { UserRolesRepository } from './user-roles.repository'
export { UnitsRepository } from './units.repository'
export { UnitOwnershipsRepository } from './unit-ownerships.repository'
export { PaymentConceptsRepository } from './payment-concepts.repository'
export { InterestConfigurationsRepository } from './interest-configurations.repository'
export { QuotasRepository } from './quotas.repository'
export { QuotaAdjustmentsRepository } from './quota-adjustments.repository'
export { QuotaFormulasRepository } from './quota-formulas.repository'
export { QuotaGenerationRulesRepository } from './quota-generation-rules.repository'
export { PaymentGatewaysRepository } from './payment-gateways.repository'
export { EntityPaymentGatewaysRepository } from './entity-payment-gateways.repository'
export { PaymentsRepository } from './payments.repository'
export { PaymentApplicationsRepository } from './payment-applications.repository'
export { ExpenseCategoriesRepository } from './expense-categories.repository'
export { ExpensesRepository } from './expenses.repository'
export { DocumentsRepository } from './documents.repository'
export { MessagesRepository } from './messages.repository'
export { AuditLogsRepository } from './audit-logs.repository'
export { PaymentPendingAllocationsRepository } from './payment-pending-allocations.repository'

// Notifications
export { NotificationTemplatesRepository } from './notification-templates.repository'
export { NotificationsRepository } from './notifications.repository'
export { NotificationDeliveriesRepository } from './notification-deliveries.repository'
export { UserNotificationPreferencesRepository } from './user-notification-preferences.repository'
export { UserFcmTokensRepository } from './user-fcm-tokens.repository'
