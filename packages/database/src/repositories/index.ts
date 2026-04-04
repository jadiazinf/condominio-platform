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
export {
  UsersRepository,
  type TAllUsersQuery,
  type TUserWithRoles,
  type TUserFullDetails,
  type TUserRoleSummary,
  type TUserRoleDetail,
  type TCondominiumWithRoles,
  type TSuperadminPermissionDetail,
} from './users.repository'
export { PermissionsRepository } from './permissions.repository'
export { RolesRepository } from './roles.repository'
export { RolePermissionsRepository } from './role-permissions.repository'
export {
  UserPermissionsRepository,
  type TUserPermissionWithDetails,
} from './user-permissions.repository'
export { ManagementCompaniesRepository } from './management-companies.repository'
export { CondominiumsRepository } from './condominiums.repository'
export { BuildingsRepository } from './buildings.repository'
export {
  UserRolesRepository,
  type TSuperadminUserWithDetails,
  type TSuperadminUsersQuery,
} from './user-roles.repository'
export { UnitsRepository } from './units.repository'
export { UnitOwnershipsRepository } from './unit-ownerships.repository'
export { InterestConfigurationsRepository } from './interest-configurations.repository'
export { PaymentGatewaysRepository } from './payment-gateways.repository'
export { EntityPaymentGatewaysRepository } from './entity-payment-gateways.repository'
export { GatewayTransactionsRepository } from './gateway-transactions.repository'
export { PaymentsRepository } from './payments.repository'
export { ExpenseCategoriesRepository } from './expense-categories.repository'
export { ExpensesRepository } from './expenses.repository'
export { DocumentsRepository } from './documents.repository'
export { MessagesRepository } from './messages.repository'
export { AuditLogsRepository } from './audit-logs.repository'
export { EventLogsRepository, type IEventLogsQuery } from './event-logs.repository'

// Notifications
export { NotificationTemplatesRepository } from './notification-templates.repository'
export { NotificationsRepository } from './notifications.repository'
export { NotificationDeliveriesRepository } from './notification-deliveries.repository'
export { UserNotificationPreferencesRepository } from './user-notification-preferences.repository'
export { UserFcmTokensRepository } from './user-fcm-tokens.repository'

// Admin Invitations
export { AdminInvitationsRepository } from './admin-invitations.repository'

// User Invitations
export { UserInvitationsRepository } from './user-invitations.repository'

// Subscriptions & Members
export { ManagementCompanySubscriptionsRepository } from './management-company-subscriptions.repository'
export { SubscriptionInvoicesRepository } from './subscription-invoices.repository'
export { ManagementCompanyMembersRepository } from './management-company-members.repository'
export {
  SubscriptionAuditHistoryRepository,
  type IAuditHistoryQuery,
} from './subscription-audit-history.repository'
export {
  SubscriptionTermsConditionsRepository,
  type ITermsQuery,
} from './subscription-terms-conditions.repository'
export { SubscriptionAcceptancesRepository } from './subscription-acceptances.repository'
export { SubscriptionRatesRepository, type IRatesQuery } from './subscription-rates.repository'

// Support Tickets
export { SupportTicketsRepository } from './support-tickets.repository'
export { SupportTicketMessagesRepository } from './support-ticket-messages.repository'

// Amenities & Reservations
export { AmenitiesRepository } from './amenities.repository'
export { AmenityReservationsRepository } from './amenity-reservations.repository'

// Access Codes & Requests
export {
  CondominiumAccessCodesRepository,
  type TCondominiumAccessCodeInsert,
} from './condominium-access-codes.repository'
export { AccessRequestsRepository, type TAccessRequestInsert } from './access-requests.repository'

// Banks & Bank Accounts
export { BanksRepository } from './banks.repository'
export { BankAccountsRepository } from './bank-accounts.repository'

// Condominium Services
export { CondominiumServicesRepository } from './condominium-services.repository'
export { ServiceExecutionsRepository } from './service-executions.repository'

// Budgets
export { BudgetsRepository } from './budgets.repository'
export { BudgetItemsRepository } from './budget-items.repository'

// Bank Reconciliation
export { BankStatementImportsRepository } from './bank-statement-imports.repository'
export { BankStatementEntriesRepository } from './bank-statement-entries.repository'
export { BankReconciliationsRepository } from './bank-reconciliations.repository'
export { BankStatementMatchesRepository } from './bank-statement-matches.repository'

// Wizard Drafts
export { WizardDraftsRepository } from './wizard-drafts.repository'

// Billing (Fase 5 — Direct Monthly Billing)
export { ChargeCategoriesRepository } from './charge-categories.repository'
export { ChargeTypesRepository } from './charge-types.repository'
export { ChargesRepository } from './charges.repository'
export { BillingReceiptsRepository } from './billing-receipts.repository'
export { UnitLedgerRepository } from './unit-ledger.repository'
export { PaymentAllocationsV2Repository } from './payment-allocations-v2.repository'
export { OwnershipTransferSnapshotsRepository } from './ownership-transfer-snapshots.repository'

// Assembly Minutes
export { AssemblyMinutesRepository } from './assembly-minutes.repository'

// Condominium Board Members
export { CondominiumBoardMembersRepository } from './condominium-board-members.repository'
