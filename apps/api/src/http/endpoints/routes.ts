import { DatabaseService } from '@database/service'
import type { TApiEndpointDefinition, IEndpoint } from './types'

import { AuditLogsEndpoint } from './audit-logs.endpoint'
import { BuildingsEndpoint } from './buildings.endpoint'
import { CondominiumsEndpoint } from './condominiums.endpoint'
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
import { PaymentsEndpoint } from './payments.endpoint'
import { PermissionsEndpoint } from './permissions.endpoint'
import { QuotasEndpoint } from './quotas.endpoint'
import { RolePermissionsEndpoint } from './role-permissions.endpoint'
import { RolesEndpoint } from './roles.endpoint'
import { UnitOwnershipsEndpoint } from './unit-ownerships.endpoint'
import { UnitsEndpoint } from './units.endpoint'
import { UserRolesEndpoint } from './user-roles.endpoint'
import { UsersEndpoint } from './users.endpoint'

/**
 * Central class that manages all API routes.
 * Instantiates all endpoints with their dependencies and provides route definitions.
 */
export class ApiRoutes {
  private readonly endpoints: IEndpoint[]

  constructor() {
    const db = DatabaseService.getInstance().getDb()

    this.endpoints = [
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

      // Payments
      new PaymentGatewaysEndpoint(db),
      new EntityPaymentGatewaysEndpoint(db),
      new PaymentsEndpoint(db),
      new PaymentApplicationsEndpoint(db),

      // Expenses
      new ExpenseCategoriesEndpoint(db),
      new ExpensesEndpoint(db),

      // Documents and messaging
      new DocumentsEndpoint(db),
      new MessagesEndpoint(db),

      // Audit
      new AuditLogsEndpoint(db),
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
