import type { TDrizzleClient } from '@database/repositories/interfaces'
import {
  AccessRequestsRepository,
  AdminInvitationsRepository,
  AmenitiesRepository,
  AmenityReservationsRepository,
  AuditLogsRepository,
  BankAccountsRepository,
  BanksRepository,
  BuildingsRepository,
  CondominiumAccessCodesRepository,
  CondominiumServicesRepository,
  CondominiumsRepository,
  CurrenciesRepository,
  DocumentsRepository,
  EntityPaymentGatewaysRepository,
  ExchangeRatesRepository,
  ExpenseCategoriesRepository,
  ExpensesRepository,
  InterestConfigurationsRepository,
  LocationsRepository,
  ManagementCompaniesRepository,
  ManagementCompanyMembersRepository,
  ManagementCompanySubscriptionsRepository,
  MessagesRepository,
  NotificationDeliveriesRepository,
  NotificationsRepository,
  NotificationTemplatesRepository,
  PaymentApplicationsRepository,
  PaymentConceptAssignmentsRepository,
  PaymentConceptBankAccountsRepository,
  PaymentConceptServicesRepository,
  PaymentConceptsRepository,
  PaymentGatewaysRepository,
  PaymentPendingAllocationsRepository,
  PaymentsRepository,
  PermissionsRepository,
  QuotaAdjustmentsRepository,
  QuotaFormulasRepository,
  QuotaGenerationRulesRepository,
  QuotasRepository,
  RolePermissionsRepository,
  RolesRepository,
  ServiceExecutionsRepository,
  SubscriptionAcceptancesRepository,
  SubscriptionAuditHistoryRepository,
  SubscriptionInvoicesRepository,
  SubscriptionRatesRepository,
  SubscriptionTermsConditionsRepository,
  SupportTicketMessagesRepository,
  SupportTicketsRepository,
  UnitOwnershipsRepository,
  UnitsRepository,
  UserFcmTokensRepository,
  UserInvitationsRepository,
  UserNotificationPreferencesRepository,
  UserPermissionsRepository,
  UserRolesRepository,
  UsersRepository,
} from '@database/repositories'
import { GatewayTransactionsRepository } from '@database/repositories/gateway-transactions.repository'
import { PaymentConceptChangesRepository } from '@database/repositories/payment-concept-changes.repository'
import { WizardDraftsRepository } from '@database/repositories'

import {
  AuthController,
  CurrenciesController,
  MyCurrenciesController,
  MyExchangeRatesController,
  LocationsController,
  UsersController,
  RolesController,
  PermissionsController,
  RolePermissionsController,
  UserRolesController,
  ManagementCompaniesController,
  CondominiumsController,
  PlatformCondominiumsController,
  BuildingsController,
  UnitsController,
  UnitOwnershipsController,
  ExchangeRatesController,
  PaymentConceptsController,
  McPaymentConceptsController,
  InterestConfigurationsController,
  QuotasController,
  QuotaAdjustmentsController,
  QuotaFormulasController,
  QuotaGenerationRulesController,
  PaymentGatewaysController,
  EntityPaymentGatewaysController,
  PaymentsController,
  PaymentApplicationsController,
  PaymentPendingAllocationsController,
  ExpenseCategoriesController,
  ExpensesController,
  DocumentsController,
  MessagesController,
  AuditLogsController,
  NotificationsController,
  NotificationTemplatesController,
  UserNotificationPreferencesController,
  UserFcmTokensController,
  AdminInvitationsController,
  UserInvitationsController,
  ManagementCompanySubscriptionsController,
  SubscriptionInvoicesController,
  ManagementCompanyMembersController,
  SubscriptionTermsConditionsController,
  SubscriptionAcceptancesController,
  SubscriptionRatesController,
  SupportTicketsController,
  SupportTicketMessagesController,
  UserTicketsController,
  AmenitiesController,
  AmenityReservationsController,
  WizardDraftsController,
} from '../controllers'

import { BanksController } from '../controllers/banks/banks.controller'
import { McCondominiumServicesController } from '../controllers/condominium-services/mc-condominium-services.controller'
import { McReserveFundController } from '../controllers/reserve-fund'
import { MyAccessRequestsController } from '../controllers/my-access-requests'
import { MyNotificationsController } from '../controllers/my-notifications'
import { ReportsController } from '../controllers/reports/reports.controller'
import { AccessCodesController } from '../controllers/access-codes'
import { AccessRequestsController } from '../controllers/access-requests'
import { BankAccountsController } from '../controllers/bank-accounts/bank-accounts.controller'
import { AddUnitOwnerService } from '@services/unit-ownerships/add-unit-owner.service'
import { ProcessWebhookService } from '@services/webhooks'
import { PaymentGatewayManager } from '@services/payment-gateways/gateway-manager'
import { PaymentFlowController } from '../controllers/payments/payment-flow.controller'
import { ApplyPaymentToQuotaService } from '@services/payment-applications/apply-payment-to-quota.service'
import { createSendNotificationService } from '../../services/notifications'
import { Hono } from 'hono'
import type { TGatewayType } from '@packages/domain'
import logger from '@packages/logger'

import type { TApiEndpointDefinition } from './types'

export function createRepositories(db: TDrizzleClient) {
  return {
    accessRequests: new AccessRequestsRepository(db),
    adminInvitations: new AdminInvitationsRepository(db),
    amenities: new AmenitiesRepository(db),
    amenityReservations: new AmenityReservationsRepository(db),
    auditLogs: new AuditLogsRepository(db),
    bankAccounts: new BankAccountsRepository(db),
    banks: new BanksRepository(db),
    buildings: new BuildingsRepository(db),
    condominiumAccessCodes: new CondominiumAccessCodesRepository(db),
    condominiumServices: new CondominiumServicesRepository(db),
    condominiums: new CondominiumsRepository(db),
    currencies: new CurrenciesRepository(db),
    documents: new DocumentsRepository(db),
    entityPaymentGateways: new EntityPaymentGatewaysRepository(db),
    exchangeRates: new ExchangeRatesRepository(db),
    expenseCategories: new ExpenseCategoriesRepository(db),
    expenses: new ExpensesRepository(db),
    gatewayTransactions: new GatewayTransactionsRepository(db),
    interestConfigurations: new InterestConfigurationsRepository(db),
    locations: new LocationsRepository(db),
    managementCompanies: new ManagementCompaniesRepository(db),
    managementCompanyMembers: new ManagementCompanyMembersRepository(db),
    managementCompanySubscriptions: new ManagementCompanySubscriptionsRepository(db),
    messages: new MessagesRepository(db),
    notificationDeliveries: new NotificationDeliveriesRepository(db),
    notifications: new NotificationsRepository(db),
    notificationTemplates: new NotificationTemplatesRepository(db),
    paymentApplications: new PaymentApplicationsRepository(db),
    paymentConceptAssignments: new PaymentConceptAssignmentsRepository(db),
    paymentConceptBankAccounts: new PaymentConceptBankAccountsRepository(db),
    paymentConceptChanges: new PaymentConceptChangesRepository(db),
    paymentConceptServices: new PaymentConceptServicesRepository(db),
    paymentConcepts: new PaymentConceptsRepository(db),
    paymentGateways: new PaymentGatewaysRepository(db),
    paymentPendingAllocations: new PaymentPendingAllocationsRepository(db),
    payments: new PaymentsRepository(db),
    permissions: new PermissionsRepository(db),
    quotaAdjustments: new QuotaAdjustmentsRepository(db),
    quotaFormulas: new QuotaFormulasRepository(db),
    quotaGenerationRules: new QuotaGenerationRulesRepository(db),
    quotas: new QuotasRepository(db),
    rolePermissions: new RolePermissionsRepository(db),
    roles: new RolesRepository(db),
    serviceExecutions: new ServiceExecutionsRepository(db),
    subscriptionAcceptances: new SubscriptionAcceptancesRepository(db),
    subscriptionAuditHistory: new SubscriptionAuditHistoryRepository(db),
    subscriptionInvoices: new SubscriptionInvoicesRepository(db),
    subscriptionRates: new SubscriptionRatesRepository(db),
    subscriptionTermsConditions: new SubscriptionTermsConditionsRepository(db),
    supportTicketMessages: new SupportTicketMessagesRepository(db),
    supportTickets: new SupportTicketsRepository(db),
    unitOwnerships: new UnitOwnershipsRepository(db),
    units: new UnitsRepository(db),
    userFcmTokens: new UserFcmTokensRepository(db),
    userInvitations: new UserInvitationsRepository(db),
    userNotificationPreferences: new UserNotificationPreferencesRepository(db),
    userPermissions: new UserPermissionsRepository(db),
    userRoles: new UserRolesRepository(db),
    users: new UsersRepository(db),
    wizardDrafts: new WizardDraftsRepository(db),
  }
}

export type TRepositories = ReturnType<typeof createRepositories>

/**
 * Adapter to check if a condominium belongs to a management company.
 * Shared between McPaymentConcepts and McCondominiumServices.
 */
function createCondominiumMCAdapter(condominiumsRepo: CondominiumsRepository) {
  return {
    getByCondominiumAndMC: async (condominiumId: string, mcId: string) => {
      const condominium = await condominiumsRepo.getById(condominiumId)
      if (!condominium) return null
      if (condominium.managementCompanyIds?.includes(mcId)) {
        return { id: condominiumId }
      }
      return null
    },
  }
}

/**
 * Adapter to check bank account-condominium association.
 */
function createBankAccountCondominiumsAdapter(bankAccountsRepo: BankAccountsRepository) {
  return {
    getByBankAccountAndCondominium: async (bankAccountId: string, condominiumId: string) => {
      const bankAccount = await bankAccountsRepo.getByIdWithCondominiums(bankAccountId)
      if (!bankAccount) return null
      if (bankAccount.appliesToAllCondominiums) return { id: bankAccountId }
      if (bankAccount.condominiumIds?.includes(condominiumId)) return { id: bankAccountId }
      return null
    },
  }
}

/**
 * Creates all route definitions from shared repositories.
 * Each repository is instantiated exactly once and shared across all controllers.
 */
export function createRoutes(db: TDrizzleClient): TApiEndpointDefinition[] {
  const r = createRepositories(db)

  // Shared adapters (no duplication)
  const condominiumMCRepo = createCondominiumMCAdapter(r.condominiums)
  const bankAccountCondominiumsRepo = createBankAccountCondominiumsAdapter(r.bankAccounts)

  // Shared services
  const gatewayManager = new PaymentGatewayManager()

  const sendNotificationService = createSendNotificationService(
    r.notifications,
    r.notificationDeliveries,
    r.userNotificationPreferences,
    r.userFcmTokens
  )

  const addUnitOwnerService = new AddUnitOwnerService(
    db,
    r.unitOwnerships,
    r.users,
    r.userRoles,
    r.userInvitations,
    r.roles,
    r.units,
    r.condominiums
  )

  return [
    // Auth
    { path: '/auth', router: new AuthController(r.users).createRouter() },

    // Core entities
    { path: '/platform/currencies', router: new CurrenciesController(r.currencies).createRouter() },
    { path: '/me/currencies', router: new MyCurrenciesController(r.currencies).createRouter() },
    {
      path: '/me/exchange-rates',
      router: new MyExchangeRatesController(r.exchangeRates).createRouter(),
    },
    { path: '/platform/locations', router: new LocationsController(r.locations).createRouter() },

    // Users and permissions
    {
      path: '/platform/users',
      router: new UsersController(
        r.users,
        db,
        r.userPermissions,
        r.userRoles,
        r.managementCompanyMembers
      ).createRouter(),
    },
    { path: '/platform/roles', router: new RolesController(r.roles).createRouter() },
    {
      path: '/platform/permissions',
      router: new PermissionsController(r.permissions).createRouter(),
    },
    {
      path: '/platform/role-permissions',
      router: new RolePermissionsController(r.rolePermissions).createRouter(),
    },
    {
      path: '/condominium/user-roles',
      router: new UserRolesController(r.userRoles).createRouter(),
    },

    // Organization structure
    {
      path: '/platform/management-companies',
      router: new ManagementCompaniesController(
        r.managementCompanies,
        r.managementCompanySubscriptions,
        r.locations,
        r.users,
        r.managementCompanyMembers,
        r.paymentConcepts
      ).createRouter(),
    },
    {
      path: '/platform/condominiums',
      router: new PlatformCondominiumsController(r.condominiums).createRouter(),
    },
    {
      path: '/condominium/condominiums',
      router: new CondominiumsController(
        r.condominiums,
        r.managementCompanySubscriptions,
        r.managementCompanies,
        r.locations,
        r.currencies,
        r.users,
        r.buildings,
        r.units,
        db
      ).createRouter(),
    },
    {
      path: '/condominium/buildings',
      router: new BuildingsController(r.buildings, db).createRouter(),
    },
    {
      path: '/condominium/units',
      router: new UnitsController(r.units, db, r.buildings).createRouter(),
    },
    {
      path: '/condominium/unit-ownerships',
      router: new UnitOwnershipsController(
        r.unitOwnerships,
        addUnitOwnerService,
        r.users,
        r.units,
        r.buildings
      ).createRouter(),
    },

    // Financial configuration
    {
      path: '/platform/exchange-rates',
      router: new ExchangeRatesController(r.exchangeRates).createRouter(),
    },
    {
      path: '/condominium/payment-concepts',
      router: new PaymentConceptsController(r.paymentConcepts).createRouter(),
    },
    {
      path: '/condominium/interest-configurations',
      router: new InterestConfigurationsController(r.interestConfigurations).createRouter(),
    },

    // Billing
    {
      path: '/condominium/quotas',
      router: new QuotasController(
        r.quotas,
        r.paymentConcepts,
        r.paymentConceptServices
      ).createRouter(),
    },
    {
      path: '/condominium/quota-adjustments',
      router: new QuotaAdjustmentsController(db, r.quotas, r.quotaAdjustments).createRouter(),
    },
    {
      path: '/condominium/quota-formulas',
      router: new QuotaFormulasController(r.quotaFormulas, r.condominiums, r.units).createRouter(),
    },
    {
      path: '/condominium/quota-generation-rules',
      router: new QuotaGenerationRulesController(
        r.quotaGenerationRules,
        r.condominiums,
        r.buildings,
        r.paymentConcepts,
        r.quotaFormulas
      ).createRouter(),
    },

    // Payments
    {
      path: '/platform/payment-gateways',
      router: new PaymentGatewaysController(r.paymentGateways).createRouter(),
    },
    {
      path: '/condominium/entity-payment-gateways',
      router: new EntityPaymentGatewaysController(r.entityPaymentGateways).createRouter(),
    },
    {
      path: '/condominium/payments',
      router: new PaymentsController(
        r.payments,
        db,
        r.paymentApplications,
        r.quotas,
        sendNotificationService,
        r.units,
        r.buildings,
        r.paymentGateways,
        r.entityPaymentGateways,
        r.gatewayTransactions,
        gatewayManager,
        r.bankAccounts,
        r.quotaAdjustments,
        r.paymentPendingAllocations
      ).createRouter(),
    },
    {
      path: '/condominium/payment-flow',
      router: new PaymentFlowController({
        quotasRepo: r.quotas,
        conceptsRepo: r.paymentConcepts,
        conceptBankAccountsRepo: r.paymentConceptBankAccounts,
        bankAccountsRepo: r.bankAccounts,
        paymentsRepo: r.payments,
        gatewayTransactionsRepo: r.gatewayTransactions,
        gatewayManager,
        applyPaymentService: new ApplyPaymentToQuotaService(
          db,
          r.paymentApplications,
          r.payments,
          r.quotas,
          r.quotaAdjustments,
          r.interestConfigurations,
          r.paymentConcepts,
          r.paymentPendingAllocations,
        ),
      }).createRouter(),
    },
    {
      path: '/condominium/payment-applications',
      router: new PaymentApplicationsController(
        r.paymentApplications,
        db,
        r.payments,
        r.quotas,
        r.quotaAdjustments,
        r.interestConfigurations,
        r.paymentConcepts,
        r.paymentPendingAllocations
      ).createRouter(),
    },
    {
      path: '/condominium/payment-pending-allocations',
      router: new PaymentPendingAllocationsController(
        r.paymentPendingAllocations,
        r.quotas,
        db,
        r.payments,
        r.paymentGateways,
        r.entityPaymentGateways,
        r.gatewayTransactions,
        gatewayManager
      ).createRouter(),
    },

    // Expenses
    {
      path: '/condominium/expense-categories',
      router: new ExpenseCategoriesController(r.expenseCategories).createRouter(),
    },
    { path: '/condominium/expenses', router: new ExpensesController(r.expenses).createRouter() },

    // Documents and messaging
    { path: '/condominium/documents', router: new DocumentsController(r.documents).createRouter() },
    { path: '/condominium/messages', router: new MessagesController(r.messages).createRouter() },

    // Notifications
    {
      path: '/condominium/notifications',
      router: new NotificationsController(
        r.notifications,
        r.notificationDeliveries,
        r.userNotificationPreferences
      ).createRouter(),
    },
    {
      path: '/platform/notification-templates',
      router: new NotificationTemplatesController(r.notificationTemplates).createRouter(),
    },
    {
      path: '/me/notification-preferences',
      router: new UserNotificationPreferencesController(
        r.userNotificationPreferences
      ).createRouter(),
    },
    { path: '/me/fcm-tokens', router: new UserFcmTokensController(r.userFcmTokens).createRouter() },
    {
      path: '/me/notifications',
      router: new MyNotificationsController(r.notifications).createRouter(),
    },

    // Audit
    { path: '/platform/audit-logs', router: new AuditLogsController(r.auditLogs).createRouter() },

    // Invitations
    {
      path: '/platform/admin-invitations',
      router: new AdminInvitationsController(
        db,
        r.adminInvitations,
        r.users,
        r.managementCompanies,
        r.managementCompanyMembers,
        r.userRoles,
        r.roles
      ).createRouter(),
    },
    {
      path: '/condominium/user-invitations',
      router: new UserInvitationsController(
        db,
        r.userInvitations,
        r.users,
        r.userRoles,
        r.userPermissions,
        r.roles,
        r.condominiums,
        r.permissions,
        r.unitOwnerships
      ).createRouter(),
    },

    // Access Codes & Requests
    {
      path: '/condominium/access-codes',
      router: new AccessCodesController(r.condominiumAccessCodes, db).createRouter(),
    },
    {
      path: '/condominium/access-requests',
      router: new AccessRequestsController(
        r.accessRequests,
        db,
        sendNotificationService
      ).createRouter(),
    },
    {
      path: '/me/access-requests',
      router: new MyAccessRequestsController(db, sendNotificationService).createRouter(),
    },

    // Banks & Bank Accounts
    { path: '/banks', router: new BanksController(r.banks).createRouter() },
    { path: '', router: new BankAccountsController(r.bankAccounts, r.banks, db).createRouter() },

    // MC Payment Concepts (management company scoped)
    {
      path: '',
      router: new McPaymentConceptsController({
        db,
        conceptsRepo: r.paymentConcepts,
        assignmentsRepo: r.paymentConceptAssignments,
        conceptBankAccountsRepo: r.paymentConceptBankAccounts,
        condominiumsRepo: r.condominiums,
        currenciesRepo: r.currencies,
        condominiumMCRepo,
        bankAccountsRepo: r.bankAccounts,
        bankAccountCondominiumsRepo,
        buildingsRepo: r.buildings,
        unitsRepo: r.units,
        quotasRepo: r.quotas,
        conceptServicesRepo: r.paymentConceptServices,
        changesRepo: r.paymentConceptChanges,
        condominiumServicesRepo: r.condominiumServices,
        executionsRepo: r.serviceExecutions,
        interestConfigsRepo: r.interestConfigurations,
        unitOwnershipsRepo: r.unitOwnerships,
      }).createRouter(),
    },

    // MC Condominium Services (management company scoped)
    {
      path: '',
      router: new McCondominiumServicesController({
        servicesRepo: r.condominiumServices,
        executionsRepo: r.serviceExecutions,
        condominiumsRepo: r.condominiums,
        condominiumMCRepo,
      }).createRouter(),
    },

    // MC Reserve Fund (management company scoped)
    {
      path: '',
      router: new McReserveFundController({
        quotasRepo: r.quotas,
        paymentsRepo: r.payments,
        expensesRepo: r.expenses,
        documentsRepo: r.documents,
        servicesRepo: r.condominiumServices,
      }).createRouter(),
    },

    // Subscriptions & Members
    {
      path: '',
      router: new ManagementCompanySubscriptionsController(
        r.managementCompanySubscriptions,
        r.managementCompanyMembers,
        r.managementCompanies,
        r.users,
        r.subscriptionAcceptances,
        r.subscriptionTermsConditions,
        r.subscriptionAuditHistory
      ).createRouter(),
    },
    { path: '', router: new SubscriptionInvoicesController(r.subscriptionInvoices).createRouter() },
    {
      path: '',
      router: new ManagementCompanyMembersController(
        r.managementCompanyMembers,
        r.userRoles,
        r.roles
      ).createRouter(),
    },
    { path: '', router: new SubscriptionRatesController(r.subscriptionRates).createRouter() },
    {
      path: '',
      router: new SubscriptionAcceptancesController(
        r.subscriptionAcceptances,
        r.managementCompanySubscriptions,
        r.subscriptionAuditHistory,
        r.managementCompanyMembers
      ).createRouter(),
    },
    {
      path: '/platform/subscription-terms',
      router: new SubscriptionTermsConditionsController(
        r.subscriptionTermsConditions
      ).createRouter(),
    },

    // Support Tickets
    {
      path: '',
      router: new SupportTicketsController(
        r.supportTickets,
        db,
        sendNotificationService
      ).createRouter(),
    },
    {
      path: '',
      router: new SupportTicketMessagesController(
        db,
        r.supportTicketMessages,
        r.supportTickets,
        r.managementCompanyMembers,
        sendNotificationService,
        r.userRoles
      ).createRouter(),
    },
    {
      path: '',
      router: new UserTicketsController(
        db,
        r.supportTickets,
        r.supportTicketMessages,
        r.managementCompanyMembers,
        sendNotificationService,
        r.userRoles
      ).createRouter(),
    },

    // Amenities & Reservations
    { path: '/condominium/amenities', router: new AmenitiesController(r.amenities).createRouter() },
    {
      path: '/condominium/amenity-reservations',
      router: new AmenityReservationsController(r.amenityReservations, r.amenities).createRouter(),
    },

    // Reports
    {
      path: '/condominium/reports',
      router: new ReportsController(r.quotas, r.payments, r.units, r.buildings).createRouter(),
    },

    // Wizard Drafts
    {
      path: '/wizard-drafts',
      router: new WizardDraftsController(r.wizardDrafts).createRouter(),
    },

    // Health check
    { path: '/health', router: createHealthRouter() },

    // Webhooks (no auth — authenticated by gateway signature)
    {
      path: '/webhooks',
      router: createWebhookRouter(db, r, sendNotificationService, gatewayManager),
    },

    // WebSocket fallback (main upgrade handled in main.ts via Bun server)
    { path: '/ws', router: createWebSocketFallbackRouter() },
  ]
}

function createHealthRouter(): Hono {
  const router = new Hono()
  router.get('/', c => {
    return c.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    })
  })
  return router
}

function createWebhookRouter(
  db: TDrizzleClient,
  r: TRepositories,
  sendNotificationService: ReturnType<typeof createSendNotificationService>,
  gatewayManager: PaymentGatewayManager
): Hono {
  const processWebhookService = new ProcessWebhookService(
    db,
    gatewayManager,
    r.paymentGateways,
    r.gatewayTransactions,
    r.payments,
    sendNotificationService,
    r.paymentPendingAllocations
  )

  const router = new Hono()

  router.post('/:gatewayType', async c => {
    const gatewayType = c.req.param('gatewayType') as TGatewayType

    try {
      const headers: Record<string, string> = {}
      c.req.raw.headers.forEach((value, key) => {
        headers[key] = value
      })

      const rawBody = await c.req.text()
      let body: unknown
      try {
        body = JSON.parse(rawBody)
      } catch {
        return c.json({ error: 'Invalid JSON body' }, 400)
      }

      const result = await processWebhookService.execute({
        gatewayType,
        headers,
        body,
        rawBody,
      })

      if (!result.success) {
        const statusCode =
          result.code === 'NOT_FOUND' ? 404 : result.code === 'FORBIDDEN' ? 403 : 400
        return c.json({ error: result.error }, statusCode)
      }

      return c.json({ received: true }, 200)
    } catch (error) {
      logger.error({ error, gatewayType }, '[Webhook] Processing failed')
      return c.json({ error: 'Webhook processing failed' }, 500)
    }
  })

  return router
}

function createWebSocketFallbackRouter(): Hono {
  const router = new Hono()

  router.get('/tickets/:ticketId', c => {
    return c.text('WebSocket upgrade must be handled by Bun server directly', 426)
  })

  router.get('/notifications', c => {
    return c.text('WebSocket upgrade must be handled by Bun server directly', 426)
  })

  return router
}
