import type { TDrizzleClient } from '@database/repositories/interfaces'
import {
  AccessRequestsRepository,
  BudgetsRepository,
  BudgetItemsRepository,
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
  PaymentGatewaysRepository,
  PaymentsRepository,
  PermissionsRepository,
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
import {
  WizardDraftsRepository,
  AssemblyMinutesRepository,
  CondominiumBoardMembersRepository,
  BankStatementImportsRepository,
  BankStatementEntriesRepository,
  BankReconciliationsRepository,
  BankStatementMatchesRepository,
  EventLogsRepository,
  ChargeCategoriesRepository,
  ChargeTypesRepository,
  ChargesRepository,
  BillingReceiptsRepository,
  UnitLedgerRepository,
  PaymentAllocationsV2Repository,
} from '@database/repositories'

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
  InterestConfigurationsController,
  PaymentGatewaysController,
  EntityPaymentGatewaysController,
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
  BudgetsController,
  AssemblyMinutesController,
  CondominiumBoardController,
  ChargeCategoriesController,
  ChargeTypesController,
} from '../controllers'

import { ChargesController } from '../controllers/charges/charges.controller'
import { BillingReceiptsController } from '../controllers/billing-receipts/billing-receipts.controller'
import { BillingLedgerController } from '../controllers/billing-ledger/billing-ledger.controller'
import { BillingAllocationsController } from '../controllers/billing-allocations/billing-allocations.controller'
import { ReceiptGenerationController } from '../controllers/receipt-generation/receipt-generation.controller'
import { AppendLedgerEntryService } from '@services/billing-ledger/append-ledger-entry.service'
import { PreviewMonthlyBillingService } from '@services/billing-generation/preview-monthly-billing.service'
import { GenerateMonthlyBillingService } from '@services/billing-generation/generate-monthly-billing.service'
import { UploadToStorageService } from '@services/file-upload/upload-to-storage.service'
import { InternalController } from '../controllers/internal'
import { BanksController } from '../controllers/banks/banks.controller'
import { McCondominiumServicesController } from '../controllers/condominium-services/mc-condominium-services.controller'
import { MyAccessRequestsController } from '../controllers/my-access-requests'
import { MyNotificationsController } from '../controllers/my-notifications'
import { AccessCodesController } from '../controllers/access-codes'
import { AccessRequestsController } from '../controllers/access-requests'
import { BankAccountsController } from '../controllers/bank-accounts/bank-accounts.controller'
import {
  EventLogsController,
  CondominiumEventLogsController,
} from '../controllers/event-logs/event-logs.controller'
import { AddUnitOwnerService } from '@services/unit-ownerships/add-unit-owner.service'
import { ProcessWebhookService } from '@services/webhooks'
import { PaymentGatewayManager } from '@services/payment-gateways/gateway-manager'
import { BankReconciliationController } from '../controllers/bank-reconciliation/bank-reconciliation.controller'
import { createSendNotificationService } from '../../services/notifications'
import { Hono } from 'hono'
import type { TGatewayType } from '@packages/domain'
import logger from '@packages/logger'

import { EventLogger } from '@packages/services'
import type { TApiEndpointDefinition } from './types'

export function createRepositories(db: TDrizzleClient) {
  return {
    accessRequests: new AccessRequestsRepository(db),
    adminInvitations: new AdminInvitationsRepository(db),
    amenities: new AmenitiesRepository(db),
    amenityReservations: new AmenityReservationsRepository(db),
    auditLogs: new AuditLogsRepository(db),
    eventLogs: new EventLogsRepository(db),
    bankAccounts: new BankAccountsRepository(db),
    banks: new BanksRepository(db),
    budgets: new BudgetsRepository(db),
    budgetItems: new BudgetItemsRepository(db),
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
    paymentGateways: new PaymentGatewaysRepository(db),
    payments: new PaymentsRepository(db),
    permissions: new PermissionsRepository(db),
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
    assemblyMinutes: new AssemblyMinutesRepository(db),
    condominiumBoardMembers: new CondominiumBoardMembersRepository(db),
    bankStatementImports: new BankStatementImportsRepository(db),
    bankStatementEntries: new BankStatementEntriesRepository(db),
    bankReconciliations: new BankReconciliationsRepository(db),
    bankStatementMatches: new BankStatementMatchesRepository(db),
    // Billing Restructure (Fase 4.7)
    chargeCategories: new ChargeCategoriesRepository(db),
    chargeTypes: new ChargeTypesRepository(db),
    charges: new ChargesRepository(db),
    billingReceipts: new BillingReceiptsRepository(db),
    unitLedger: new UnitLedgerRepository(db),
    paymentAllocationsV2: new PaymentAllocationsV2Repository(db),
  }
}

export type TRepositories = ReturnType<typeof createRepositories>

/**
 * Adapter to check if a condominium belongs to a management company.
 * Used by McCondominiumServices.
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
 * Creates all route definitions from shared repositories.
 * Each repository is instantiated exactly once and shared across all controllers.
 */
export function createRoutes(db: TDrizzleClient): TApiEndpointDefinition[] {
  const r = createRepositories(db)

  // Shared adapters (no duplication)
  const condominiumMCRepo = createCondominiumMCAdapter(r.condominiums)

  // Event Logger (fire-and-forget)
  const eventLogger = new EventLogger(r.eventLogs)

  // Shared services
  const gatewayManager = new PaymentGatewayManager(eventLogger)

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
        undefined, // invitationsRepository
        undefined, // userRolesRepository
        undefined, // rolesRepository
        undefined, // auditLogsRepository
        r.currencies
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
      path: '/condominium/interest-configurations',
      router: new InterestConfigurationsController(r.interestConfigurations).createRouter(),
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
    // TODO: PaymentsController, PaymentFlowController, AccountStatementsController,
    // PaymentApplicationsController, and PaymentPendingAllocationsController
    // removed — they depend on deleted quota/payment-concept repos.
    // Payment flow is now handled via /billing/* routes.

    // Expenses
    {
      path: '/condominium/expense-categories',
      router: new ExpenseCategoriesController(r.expenseCategories).createRouter(),
    },
    { path: '/condominium/expenses', router: new ExpensesController(r.expenses).createRouter() },

    // Budgets
    {
      path: '/condominium/budgets',
      router: new BudgetsController(r.budgets, r.budgetItems, r.expenses, r.units).createRouter(),
    },

    // Old Condominium Receipts removed — replaced by /billing/receipts

    // Bank Reconciliation
    {
      path: '/condominium/bank-reconciliation',
      router: new BankReconciliationController(
        r.bankStatementImports,
        r.bankStatementEntries,
        r.bankReconciliations,
        r.bankStatementMatches,
        r.payments,
        r.gatewayTransactions
      ).createRouter(),
    },

    // Billing Restructure (Fase 4.7)
    {
      path: '/billing/charges',
      router: new ChargesController(r.charges, r.chargeTypes, r.unitLedger).createRouter(),
    },
    {
      path: '/billing/receipts',
      router: new BillingReceiptsController(
        r.billingReceipts, r.charges, r.paymentAllocationsV2, r.unitLedger,
        r.chargeTypes, r.units, r.buildings, r.condominiums, r.currencies,
        r.unitOwnerships,
      ).createRouter(),
    },
    {
      path: '/billing/units',
      router: new BillingLedgerController(r.unitLedger, r.charges).createRouter(),
    },
    {
      path: '/billing/allocations',
      router: new BillingAllocationsController(r.paymentAllocationsV2).createRouter(),
    },
    {
      path: '/billing/receipt-generation',
      router: (() => {
        const unitsAdapter = {
          findByCondominium: (condoId: string, opts?: { active: boolean }) =>
            r.units.getByCondominiumId(condoId).then(all =>
              opts?.active ? all.filter(u => u.isActive) : all),
          findByBuilding: (buildingId: string, opts?: { active: boolean }) =>
            r.units.getByBuildingId(buildingId, !opts?.active),
        }
        const condominiumsAdapter = {
          getById: async (id: string) => {
            const c = await r.condominiums.getById(id)
            if (!c) return null
            return { id: c.id, code: c.code, receiptNumberFormat: (c as any).receiptNumberFormat ?? null }
          },
        }
        const appendLedgerService = new AppendLedgerEntryService(r.unitLedger)
        const previewService = new PreviewMonthlyBillingService(unitsAdapter, r.chargeTypes, r.chargeCategories)
        const generateService = new GenerateMonthlyBillingService(
          unitsAdapter, r.chargeTypes, r.billingReceipts, r.charges,
          r.unitLedger, appendLedgerService, condominiumsAdapter, r.chargeCategories,
        )
        const uploadService = new UploadToStorageService()
        return new ReceiptGenerationController(previewService, generateService, uploadService, r.documents).createRouter()
      })(),
    },

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

    // Event Logs
    { path: '/platform/event-logs', router: new EventLogsController(r.eventLogs).createRouter() },
    {
      path: '/condominium/event-logs',
      router: new CondominiumEventLogsController(r.eventLogs).createRouter(),
    },

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

    // MC Payment Concepts removed — old billing system

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

    // MC Reserve Fund — temporarily removed (depends on deleted quotas repo)
    // TODO: Restore with billing-system repos

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

    // Reports — temporarily removed (depends on deleted quotas repo)
    // TODO: Restore with billing-system repos

    // Wizard Drafts
    {
      path: '/wizard-drafts',
      router: new WizardDraftsController(r.wizardDrafts).createRouter(),
    },

    // Assembly Minutes
    {
      path: '/condominium/assembly-minutes',
      router: new AssemblyMinutesController(r.assemblyMinutes).createRouter(),
    },

    // Condominium Board Members
    {
      path: '/condominium/board',
      router: new CondominiumBoardController(r.condominiumBoardMembers).createRouter(),
    },

    // Charge Categories (read-only)
    {
      path: '/condominium/charge-categories',
      router: new ChargeCategoriesController(r.chargeCategories).createRouter(),
    },

    // Charge Types (CRUD)
    {
      path: '/condominium/charge-types',
      router: new ChargeTypesController(r.chargeTypes).createRouter(),
    },

    // Health check
    { path: '/health', router: createHealthRouter() },

    // Internal (inter-service communication, secured by INTERNAL_API_KEY)
    {
      path: '/internal',
      router: new InternalController(r.notifications).createRouter(),
    },

    // Webhooks (no auth — authenticated by gateway signature)
    {
      path: '/webhooks',
      router: createWebhookRouter(db, r, sendNotificationService, gatewayManager, eventLogger),
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
  gatewayManager: PaymentGatewayManager,
  eventLogger?: EventLogger
): Hono {
  const processWebhookService = new ProcessWebhookService(
    db,
    gatewayManager,
    r.paymentGateways,
    r.gatewayTransactions,
    r.payments,
    sendNotificationService,
    eventLogger
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
