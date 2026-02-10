import { DatabaseService } from '@database/service'
import type { TApiEndpointDefinition, IEndpoint } from './types'

import { AuthEndpoint } from './auth.endpoint'
import { HealthEndpoint } from './health.endpoint'
import { AuditLogsEndpoint } from './audit-logs.endpoint'
import { BuildingsEndpoint } from './buildings.endpoint'
import { CondominiumsEndpoint } from './condominiums.endpoint'
import { PlatformCondominiumsEndpoint } from './platform-condominiums.endpoint'
import { CurrenciesEndpoint } from './currencies.endpoint'
import { DocumentsEndpoint } from './documents.endpoint'
import { EntityPaymentGatewaysEndpoint } from './entity-payment-gateways.endpoint'
import { ExchangeRatesEndpoint } from './exchange-rates.endpoint'
import { ExpenseCategoriesEndpoint } from './expense-categories.endpoint'
import { ExpensesEndpoint } from './expenses.endpoint'
import { InterestConfigurationsEndpoint } from './interest-configurations.endpoint'
import { LocationsEndpoint } from './locations.endpoint'
import { ManagementCompaniesEndpoint } from './management-companies.endpoint'
import { MessagesEndpoint } from './messages.endpoint'
import { PaymentApplicationsEndpoint } from './payment-applications.endpoint'
import { PaymentConceptsEndpoint } from './payment-concepts.endpoint'
import { PaymentGatewaysEndpoint } from './payment-gateways.endpoint'
import { PaymentPendingAllocationsEndpoint } from './payment-pending-allocations.endpoint'
import { PaymentsEndpoint } from './payments.endpoint'
import { PermissionsEndpoint } from './permissions.endpoint'
import { QuotasEndpoint } from './quotas.endpoint'
import { QuotaAdjustmentsEndpoint } from './quota-adjustments.endpoint'
import { QuotaFormulasEndpoint } from './quota-formulas.endpoint'
import { QuotaGenerationRulesEndpoint } from './quota-generation-rules.endpoint'
import { RolePermissionsEndpoint } from './role-permissions.endpoint'
import { RolesEndpoint } from './roles.endpoint'
import { UnitOwnershipsEndpoint } from './unit-ownerships.endpoint'
import { UnitsEndpoint } from './units.endpoint'
import { UserRolesEndpoint } from './user-roles.endpoint'
import { UsersEndpoint } from './users.endpoint'
import { NotificationsEndpoint } from './notifications.endpoint'
import { NotificationTemplatesEndpoint } from './notification-templates.endpoint'
import { UserNotificationPreferencesEndpoint } from './user-notification-preferences.endpoint'
import { UserFcmTokensEndpoint } from './user-fcm-tokens.endpoint'
import { AdminInvitationsEndpoint } from './admin-invitations.endpoint'
import { UserInvitationsEndpoint } from './user-invitations.endpoint'
import { ManagementCompanySubscriptionsEndpoint } from './management-company-subscriptions.endpoint'
import { SubscriptionInvoicesEndpoint } from './subscription-invoices.endpoint'
import { ManagementCompanyMembersEndpoint } from './management-company-members.endpoint'
import { SupportTicketsEndpoint } from './support-tickets.endpoint'
import { SupportTicketMessagesEndpoint } from './support-ticket-messages.endpoint'
import { SubscriptionRatesEndpoint } from './subscription-rates.endpoint'
import { AmenitiesEndpoint } from './amenities.endpoint'
import { AmenityReservationsEndpoint } from './amenity-reservations.endpoint'
import { WebSocketEndpoint } from './websocket.endpoint'
import { ReportsEndpoint } from './reports.endpoint'

/**
 * Central class that manages all API routes.
 * Instantiates all endpoints with their dependencies and provides route definitions.
 */
export class ApiRoutes {
  private readonly endpoints: IEndpoint[]

  constructor() {
    const db = DatabaseService.getInstance().getDb()

    this.endpoints = [
      // Health check (no DB dependency)
      new HealthEndpoint(),

      // Auth (public endpoints for registration)
      new AuthEndpoint(db),

      // Core entities
      new CurrenciesEndpoint(db),
      new LocationsEndpoint(db),

      // Users and permissions
      new UsersEndpoint(db),
      new RolesEndpoint(db),
      new PermissionsEndpoint(db),
      new RolePermissionsEndpoint(db),
      new UserRolesEndpoint(db),

      // Organization structure
      new ManagementCompaniesEndpoint(db),
      new PlatformCondominiumsEndpoint(db),
      new CondominiumsEndpoint(db),
      new BuildingsEndpoint(db),
      new UnitsEndpoint(db),
      new UnitOwnershipsEndpoint(db),

      // Financial configuration
      new ExchangeRatesEndpoint(db),
      new PaymentConceptsEndpoint(db),
      new InterestConfigurationsEndpoint(db),

      // Billing
      new QuotasEndpoint(db),
      new QuotaAdjustmentsEndpoint(db),
      new QuotaFormulasEndpoint(db),
      new QuotaGenerationRulesEndpoint(db),

      // Payments
      new PaymentGatewaysEndpoint(db),
      new EntityPaymentGatewaysEndpoint(db),
      new PaymentsEndpoint(db),
      new PaymentApplicationsEndpoint(db),
      new PaymentPendingAllocationsEndpoint(db),

      // Expenses
      new ExpenseCategoriesEndpoint(db),
      new ExpensesEndpoint(db),

      // Documents and messaging
      new DocumentsEndpoint(db),
      new MessagesEndpoint(db),

      // Notifications
      new NotificationsEndpoint(db),
      new NotificationTemplatesEndpoint(db),
      new UserNotificationPreferencesEndpoint(db),
      new UserFcmTokensEndpoint(db),

      // Audit
      new AuditLogsEndpoint(db),

      // Admin Invitations
      new AdminInvitationsEndpoint(db),

      // User Invitations
      new UserInvitationsEndpoint(db),

      // Subscriptions & Members
      new ManagementCompanySubscriptionsEndpoint(db),
      new SubscriptionInvoicesEndpoint(db),
      new ManagementCompanyMembersEndpoint(db),
      new SubscriptionRatesEndpoint(db),

      // Support Tickets
      new SupportTicketsEndpoint(db),
      new SupportTicketMessagesEndpoint(db),

      // Amenities & Reservations
      new AmenitiesEndpoint(db),
      new AmenityReservationsEndpoint(db),

      // Reports
      new ReportsEndpoint(),

      // WebSocket
      new WebSocketEndpoint(),
    ]
  }

  /**
   * Returns all route definitions for the API.
   */
  getRoutes(): TApiEndpointDefinition[] {
    return this.endpoints.map(endpoint => ({
      path: endpoint.path,
      router: endpoint.getRouter(),
    }))
  }
}
