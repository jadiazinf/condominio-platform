import { relations } from 'drizzle-orm'

// Import all tables
import { locations } from '../tables/locations'
import { currencies } from '../tables/currencies'
import { exchangeRates } from '../tables/exchange-rates'
import { users } from '../tables/users'
import { permissions } from '../tables/permissions'
import { roles } from '../tables/roles'
import { rolePermissions } from '../tables/role-permissions'
import { managementCompanies } from '../tables/management-companies'
import { condominiums } from '../tables/condominiums'
import { buildings } from '../tables/buildings'
import { userRoles } from '../tables/user-roles'
import { units } from '../tables/units'
import { unitOwnerships } from '../tables/unit-ownerships'
import { paymentConcepts } from '../tables/payment-concepts'
import { interestConfigurations } from '../tables/interest-configurations'
import { quotas, quotaAdjustments } from '../tables/quotas'
import {
  quotaFormulas,
  quotaGenerationRules,
  quotaGenerationSchedules,
  quotaGenerationLogs,
  paymentPendingAllocations,
} from '../tables/quota-generation'
import { paymentGateways, entityPaymentGateways } from '../tables/payment-gateways'
import { payments, paymentApplications } from '../tables/payments'
import { expenseCategories, expenses } from '../tables/expenses'
import { documents } from '../tables/documents'
import { messages } from '../tables/messages'
import {
  notificationTemplates,
  notifications,
  notificationDeliveries,
  userNotificationPreferences,
  userFcmTokens,
} from '../tables/notifications'
import { superadminUsers, superadminUserPermissions } from '../tables/superadmin'
import { auditLogs } from '../tables/audit-logs'
import { adminInvitations } from '../tables/admin-invitations'
import { managementCompanySubscriptions } from '../tables/management-company-subscriptions'
import { subscriptionInvoices } from '../tables/subscription-invoices'
import { managementCompanyMembers } from '../tables/management-company-members'
import { supportTickets } from '../tables/support-tickets'
import { supportTicketMessages } from '../tables/support-ticket-messages'

// ============================================================================
// LOCATIONS RELATIONS
// ============================================================================

export const locationsRelations = relations(locations, ({ one, many }) => ({
  parent: one(locations, {
    fields: [locations.parentId],
    references: [locations.id],
    relationName: 'locationHierarchy',
  }),
  children: many(locations, { relationName: 'locationHierarchy' }),
  registeredByUser: one(users, {
    fields: [locations.registeredBy],
    references: [users.id],
  }),
  users: many(users),
  managementCompanies: many(managementCompanies),
  condominiums: many(condominiums),
}))

// ============================================================================
// CURRENCIES RELATIONS
// ============================================================================

export const currenciesRelations = relations(currencies, ({ one, many }) => ({
  registeredByUser: one(users, {
    fields: [currencies.registeredBy],
    references: [users.id],
  }),
  exchangeRatesFrom: many(exchangeRates, { relationName: 'fromCurrency' }),
  exchangeRatesTo: many(exchangeRates, { relationName: 'toCurrency' }),
  users: many(users),
  condominiums: many(condominiums),
  paymentConcepts: many(paymentConcepts),
  interestConfigurations: many(interestConfigurations),
  quotas: many(quotas),
  payments: many(payments),
  expenses: many(expenses),
  managementCompanySubscriptions: many(managementCompanySubscriptions),
  subscriptionInvoices: many(subscriptionInvoices),
}))

export const exchangeRatesRelations = relations(exchangeRates, ({ one }) => ({
  fromCurrency: one(currencies, {
    fields: [exchangeRates.fromCurrencyId],
    references: [currencies.id],
    relationName: 'fromCurrency',
  }),
  toCurrency: one(currencies, {
    fields: [exchangeRates.toCurrencyId],
    references: [currencies.id],
    relationName: 'toCurrency',
  }),
  createdByUser: one(users, {
    fields: [exchangeRates.createdBy],
    references: [users.id],
  }),
  registeredByUser: one(users, {
    fields: [exchangeRates.registeredBy],
    references: [users.id],
  }),
}))

// ============================================================================
// USERS RELATIONS
// ============================================================================

export const usersRelations = relations(users, ({ one, many }) => ({
  location: one(locations, {
    fields: [users.locationId],
    references: [locations.id],
  }),
  preferredCurrency: one(currencies, {
    fields: [users.preferredCurrencyId],
    references: [currencies.id],
  }),
  userRoles: many(userRoles),
  unitOwnerships: many(unitOwnerships),
  payments: many(payments),
  messages: many(messages),
  documents: many(documents),
  notifications: many(notifications),
  notificationPreferences: many(userNotificationPreferences),
  fcmTokens: many(userFcmTokens),
  adminInvitations: many(adminInvitations),
}))

// ============================================================================
// PERMISSIONS & ROLES RELATIONS
// ============================================================================

export const permissionsRelations = relations(permissions, ({ one, many }) => ({
  registeredByUser: one(users, {
    fields: [permissions.registeredBy],
    references: [users.id],
  }),
  rolePermissions: many(rolePermissions),
}))

export const rolesRelations = relations(roles, ({ one, many }) => ({
  registeredByUser: one(users, {
    fields: [roles.registeredBy],
    references: [users.id],
  }),
  rolePermissions: many(rolePermissions),
  userRoles: many(userRoles),
}))

export const rolePermissionsRelations = relations(rolePermissions, ({ one }) => ({
  role: one(roles, {
    fields: [rolePermissions.roleId],
    references: [roles.id],
  }),
  permission: one(permissions, {
    fields: [rolePermissions.permissionId],
    references: [permissions.id],
  }),
  registeredByUser: one(users, {
    fields: [rolePermissions.registeredBy],
    references: [users.id],
  }),
}))

export const userRolesRelations = relations(userRoles, ({ one }) => ({
  user: one(users, {
    fields: [userRoles.userId],
    references: [users.id],
  }),
  role: one(roles, {
    fields: [userRoles.roleId],
    references: [roles.id],
  }),
  condominium: one(condominiums, {
    fields: [userRoles.condominiumId],
    references: [condominiums.id],
  }),
  building: one(buildings, {
    fields: [userRoles.buildingId],
    references: [buildings.id],
  }),
  assignedByUser: one(users, {
    fields: [userRoles.assignedBy],
    references: [users.id],
  }),
  registeredByUser: one(users, {
    fields: [userRoles.registeredBy],
    references: [users.id],
  }),
}))

// ============================================================================
// ORGANIZATIONS RELATIONS
// ============================================================================

export const managementCompaniesRelations = relations(managementCompanies, ({ one, many }) => ({
  location: one(locations, {
    fields: [managementCompanies.locationId],
    references: [locations.id],
  }),
  createdByUser: one(users, {
    fields: [managementCompanies.createdBy],
    references: [users.id],
  }),
  condominiums: many(condominiums),
  adminInvitations: many(adminInvitations),
  subscriptions: many(managementCompanySubscriptions),
  members: many(managementCompanyMembers),
  supportTickets: many(supportTickets),
}))

export const condominiumsRelations = relations(condominiums, ({ one, many }) => ({
  managementCompany: one(managementCompanies, {
    fields: [condominiums.managementCompanyId],
    references: [managementCompanies.id],
  }),
  location: one(locations, {
    fields: [condominiums.locationId],
    references: [locations.id],
  }),
  defaultCurrency: one(currencies, {
    fields: [condominiums.defaultCurrencyId],
    references: [currencies.id],
  }),
  createdByUser: one(users, {
    fields: [condominiums.createdBy],
    references: [users.id],
  }),
  buildings: many(buildings),
  userRoles: many(userRoles),
  paymentConcepts: many(paymentConcepts),
  interestConfigurations: many(interestConfigurations),
  entityPaymentGateways: many(entityPaymentGateways),
  expenses: many(expenses),
  documents: many(documents),
  messages: many(messages),
  quotaFormulas: many(quotaFormulas),
  quotaGenerationRules: many(quotaGenerationRules),
}))

export const buildingsRelations = relations(buildings, ({ one, many }) => ({
  condominium: one(condominiums, {
    fields: [buildings.condominiumId],
    references: [condominiums.id],
  }),
  createdByUser: one(users, {
    fields: [buildings.createdBy],
    references: [users.id],
  }),
  units: many(units),
  userRoles: many(userRoles),
  paymentConcepts: many(paymentConcepts),
  interestConfigurations: many(interestConfigurations),
  entityPaymentGateways: many(entityPaymentGateways),
  expenses: many(expenses),
  documents: many(documents),
  messages: many(messages),
  quotaGenerationRules: many(quotaGenerationRules),
}))

// ============================================================================
// UNITS RELATIONS
// ============================================================================

export const unitsRelations = relations(units, ({ one, many }) => ({
  building: one(buildings, {
    fields: [units.buildingId],
    references: [buildings.id],
  }),
  createdByUser: one(users, {
    fields: [units.createdBy],
    references: [users.id],
  }),
  unitOwnerships: many(unitOwnerships),
  quotas: many(quotas),
  payments: many(payments),
  documents: many(documents),
  messages: many(messages),
}))

export const unitOwnershipsRelations = relations(unitOwnerships, ({ one }) => ({
  unit: one(units, {
    fields: [unitOwnerships.unitId],
    references: [units.id],
  }),
  user: one(users, {
    fields: [unitOwnerships.userId],
    references: [users.id],
  }),
}))

// ============================================================================
// PAYMENT CONCEPTS RELATIONS
// ============================================================================

export const paymentConceptsRelations = relations(paymentConcepts, ({ one, many }) => ({
  condominium: one(condominiums, {
    fields: [paymentConcepts.condominiumId],
    references: [condominiums.id],
  }),
  building: one(buildings, {
    fields: [paymentConcepts.buildingId],
    references: [buildings.id],
  }),
  currency: one(currencies, {
    fields: [paymentConcepts.currencyId],
    references: [currencies.id],
  }),
  createdByUser: one(users, {
    fields: [paymentConcepts.createdBy],
    references: [users.id],
  }),
  interestConfigurations: many(interestConfigurations),
  quotas: many(quotas),
  generationRules: many(quotaGenerationRules),
}))

export const interestConfigurationsRelations = relations(interestConfigurations, ({ one }) => ({
  condominium: one(condominiums, {
    fields: [interestConfigurations.condominiumId],
    references: [condominiums.id],
  }),
  building: one(buildings, {
    fields: [interestConfigurations.buildingId],
    references: [buildings.id],
  }),
  paymentConcept: one(paymentConcepts, {
    fields: [interestConfigurations.paymentConceptId],
    references: [paymentConcepts.id],
  }),
  currency: one(currencies, {
    fields: [interestConfigurations.currencyId],
    references: [currencies.id],
  }),
  createdByUser: one(users, {
    fields: [interestConfigurations.createdBy],
    references: [users.id],
  }),
}))

// ============================================================================
// QUOTAS RELATIONS
// ============================================================================

export const quotasRelations = relations(quotas, ({ one, many }) => ({
  unit: one(units, {
    fields: [quotas.unitId],
    references: [units.id],
  }),
  paymentConcept: one(paymentConcepts, {
    fields: [quotas.paymentConceptId],
    references: [paymentConcepts.id],
  }),
  currency: one(currencies, {
    fields: [quotas.currencyId],
    references: [currencies.id],
  }),
  createdByUser: one(users, {
    fields: [quotas.createdBy],
    references: [users.id],
  }),
  paymentApplications: many(paymentApplications),
  documents: many(documents),
  adjustments: many(quotaAdjustments),
  allocatedFromPending: many(paymentPendingAllocations),
}))

export const quotaAdjustmentsRelations = relations(quotaAdjustments, ({ one }) => ({
  quota: one(quotas, {
    fields: [quotaAdjustments.quotaId],
    references: [quotas.id],
  }),
  createdByUser: one(users, {
    fields: [quotaAdjustments.createdBy],
    references: [users.id],
  }),
}))

// ============================================================================
// QUOTA GENERATION RELATIONS
// ============================================================================

export const quotaFormulasRelations = relations(quotaFormulas, ({ one, many }) => ({
  condominium: one(condominiums, {
    fields: [quotaFormulas.condominiumId],
    references: [condominiums.id],
  }),
  currency: one(currencies, {
    fields: [quotaFormulas.currencyId],
    references: [currencies.id],
  }),
  createdByUser: one(users, {
    fields: [quotaFormulas.createdBy],
    references: [users.id],
  }),
  updatedByUser: one(users, {
    fields: [quotaFormulas.updatedBy],
    references: [users.id],
  }),
  generationRules: many(quotaGenerationRules),
}))

export const quotaGenerationRulesRelations = relations(quotaGenerationRules, ({ one, many }) => ({
  condominium: one(condominiums, {
    fields: [quotaGenerationRules.condominiumId],
    references: [condominiums.id],
  }),
  building: one(buildings, {
    fields: [quotaGenerationRules.buildingId],
    references: [buildings.id],
  }),
  paymentConcept: one(paymentConcepts, {
    fields: [quotaGenerationRules.paymentConceptId],
    references: [paymentConcepts.id],
  }),
  quotaFormula: one(quotaFormulas, {
    fields: [quotaGenerationRules.quotaFormulaId],
    references: [quotaFormulas.id],
  }),
  createdByUser: one(users, {
    fields: [quotaGenerationRules.createdBy],
    references: [users.id],
  }),
  updatedByUser: one(users, {
    fields: [quotaGenerationRules.updatedBy],
    references: [users.id],
  }),
  schedules: many(quotaGenerationSchedules),
  logs: many(quotaGenerationLogs),
}))

export const quotaGenerationSchedulesRelations = relations(quotaGenerationSchedules, ({ one }) => ({
  generationRule: one(quotaGenerationRules, {
    fields: [quotaGenerationSchedules.quotaGenerationRuleId],
    references: [quotaGenerationRules.id],
  }),
  createdByUser: one(users, {
    fields: [quotaGenerationSchedules.createdBy],
    references: [users.id],
  }),
  updatedByUser: one(users, {
    fields: [quotaGenerationSchedules.updatedBy],
    references: [users.id],
  }),
}))

export const quotaGenerationLogsRelations = relations(quotaGenerationLogs, ({ one }) => ({
  generationRule: one(quotaGenerationRules, {
    fields: [quotaGenerationLogs.generationRuleId],
    references: [quotaGenerationRules.id],
  }),
  generationSchedule: one(quotaGenerationSchedules, {
    fields: [quotaGenerationLogs.generationScheduleId],
    references: [quotaGenerationSchedules.id],
  }),
  quotaFormula: one(quotaFormulas, {
    fields: [quotaGenerationLogs.quotaFormulaId],
    references: [quotaFormulas.id],
  }),
  currency: one(currencies, {
    fields: [quotaGenerationLogs.currencyId],
    references: [currencies.id],
  }),
  generatedByUser: one(users, {
    fields: [quotaGenerationLogs.generatedBy],
    references: [users.id],
  }),
}))

export const paymentPendingAllocationsRelations = relations(
  paymentPendingAllocations,
  ({ one }) => ({
    payment: one(payments, {
      fields: [paymentPendingAllocations.paymentId],
      references: [payments.id],
    }),
    currency: one(currencies, {
      fields: [paymentPendingAllocations.currencyId],
      references: [currencies.id],
    }),
    allocatedToQuota: one(quotas, {
      fields: [paymentPendingAllocations.allocatedToQuotaId],
      references: [quotas.id],
    }),
    allocatedByUser: one(users, {
      fields: [paymentPendingAllocations.allocatedBy],
      references: [users.id],
    }),
  })
)

// ============================================================================
// PAYMENT GATEWAYS RELATIONS
// ============================================================================

export const paymentGatewaysRelations = relations(paymentGateways, ({ one, many }) => ({
  registeredByUser: one(users, {
    fields: [paymentGateways.registeredBy],
    references: [users.id],
  }),
  entityPaymentGateways: many(entityPaymentGateways),
  payments: many(payments),
}))

export const entityPaymentGatewaysRelations = relations(entityPaymentGateways, ({ one }) => ({
  paymentGateway: one(paymentGateways, {
    fields: [entityPaymentGateways.paymentGatewayId],
    references: [paymentGateways.id],
  }),
  condominium: one(condominiums, {
    fields: [entityPaymentGateways.condominiumId],
    references: [condominiums.id],
  }),
  building: one(buildings, {
    fields: [entityPaymentGateways.buildingId],
    references: [buildings.id],
  }),
  registeredByUser: one(users, {
    fields: [entityPaymentGateways.registeredBy],
    references: [users.id],
  }),
}))

// ============================================================================
// PAYMENTS RELATIONS
// ============================================================================

export const paymentsRelations = relations(payments, ({ one, many }) => ({
  user: one(users, {
    fields: [payments.userId],
    references: [users.id],
  }),
  unit: one(units, {
    fields: [payments.unitId],
    references: [units.id],
  }),
  currency: one(currencies, {
    fields: [payments.currencyId],
    references: [currencies.id],
  }),
  paidCurrency: one(currencies, {
    fields: [payments.paidCurrencyId],
    references: [currencies.id],
  }),
  paymentGateway: one(paymentGateways, {
    fields: [payments.paymentGatewayId],
    references: [paymentGateways.id],
  }),
  registeredByUser: one(users, {
    fields: [payments.registeredBy],
    references: [users.id],
  }),
  paymentApplications: many(paymentApplications),
  documents: many(documents),
  pendingAllocations: many(paymentPendingAllocations),
}))

export const paymentApplicationsRelations = relations(paymentApplications, ({ one }) => ({
  payment: one(payments, {
    fields: [paymentApplications.paymentId],
    references: [payments.id],
  }),
  quota: one(quotas, {
    fields: [paymentApplications.quotaId],
    references: [quotas.id],
  }),
  registeredByUser: one(users, {
    fields: [paymentApplications.registeredBy],
    references: [users.id],
  }),
}))

// ============================================================================
// EXPENSES RELATIONS
// ============================================================================

export const expenseCategoriesRelations = relations(expenseCategories, ({ one, many }) => ({
  parent: one(expenseCategories, {
    fields: [expenseCategories.parentCategoryId],
    references: [expenseCategories.id],
    relationName: 'categoryHierarchy',
  }),
  children: many(expenseCategories, { relationName: 'categoryHierarchy' }),
  registeredByUser: one(users, {
    fields: [expenseCategories.registeredBy],
    references: [users.id],
  }),
  expenses: many(expenses),
}))

export const expensesRelations = relations(expenses, ({ one, many }) => ({
  condominium: one(condominiums, {
    fields: [expenses.condominiumId],
    references: [condominiums.id],
  }),
  building: one(buildings, {
    fields: [expenses.buildingId],
    references: [buildings.id],
  }),
  expenseCategory: one(expenseCategories, {
    fields: [expenses.expenseCategoryId],
    references: [expenseCategories.id],
  }),
  currency: one(currencies, {
    fields: [expenses.currencyId],
    references: [currencies.id],
  }),
  approvedByUser: one(users, {
    fields: [expenses.approvedBy],
    references: [users.id],
  }),
  createdByUser: one(users, {
    fields: [expenses.createdBy],
    references: [users.id],
  }),
  documents: many(documents),
}))

// ============================================================================
// DOCUMENTS RELATIONS
// ============================================================================

export const documentsRelations = relations(documents, ({ one }) => ({
  condominium: one(condominiums, {
    fields: [documents.condominiumId],
    references: [condominiums.id],
  }),
  building: one(buildings, {
    fields: [documents.buildingId],
    references: [buildings.id],
  }),
  unit: one(units, {
    fields: [documents.unitId],
    references: [units.id],
  }),
  user: one(users, {
    fields: [documents.userId],
    references: [users.id],
  }),
  payment: one(payments, {
    fields: [documents.paymentId],
    references: [payments.id],
  }),
  quota: one(quotas, {
    fields: [documents.quotaId],
    references: [quotas.id],
  }),
  expense: one(expenses, {
    fields: [documents.expenseId],
    references: [expenses.id],
  }),
  createdByUser: one(users, {
    fields: [documents.createdBy],
    references: [users.id],
  }),
}))

// ============================================================================
// MESSAGES RELATIONS
// ============================================================================

export const messagesRelations = relations(messages, ({ one }) => ({
  sender: one(users, {
    fields: [messages.senderId],
    references: [users.id],
  }),
  recipientUser: one(users, {
    fields: [messages.recipientUserId],
    references: [users.id],
  }),
  recipientCondominium: one(condominiums, {
    fields: [messages.recipientCondominiumId],
    references: [condominiums.id],
  }),
  recipientBuilding: one(buildings, {
    fields: [messages.recipientBuildingId],
    references: [buildings.id],
  }),
  recipientUnit: one(units, {
    fields: [messages.recipientUnitId],
    references: [units.id],
  }),
  registeredByUser: one(users, {
    fields: [messages.registeredBy],
    references: [users.id],
  }),
}))

// ============================================================================
// NOTIFICATIONS RELATIONS
// ============================================================================

export const notificationTemplatesRelations = relations(notificationTemplates, ({ one, many }) => ({
  createdByUser: one(users, {
    fields: [notificationTemplates.createdBy],
    references: [users.id],
  }),
  notifications: many(notifications),
}))

export const notificationsRelations = relations(notifications, ({ one, many }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
  template: one(notificationTemplates, {
    fields: [notifications.templateId],
    references: [notificationTemplates.id],
  }),
  deliveries: many(notificationDeliveries),
}))

export const notificationDeliveriesRelations = relations(notificationDeliveries, ({ one }) => ({
  notification: one(notifications, {
    fields: [notificationDeliveries.notificationId],
    references: [notifications.id],
  }),
}))

export const userNotificationPreferencesRelations = relations(
  userNotificationPreferences,
  ({ one }) => ({
    user: one(users, {
      fields: [userNotificationPreferences.userId],
      references: [users.id],
    }),
  })
)

export const userFcmTokensRelations = relations(userFcmTokens, ({ one }) => ({
  user: one(users, {
    fields: [userFcmTokens.userId],
    references: [users.id],
  }),
}))

// ============================================================================
// SUPERADMIN RELATIONS
// ============================================================================

export const superadminUsersRelations = relations(superadminUsers, ({ one, many }) => ({
  user: one(users, {
    fields: [superadminUsers.userId],
    references: [users.id],
  }),
  createdByUser: one(users, {
    fields: [superadminUsers.createdBy],
    references: [users.id],
  }),
  permissions: many(superadminUserPermissions),
}))

export const superadminUserPermissionsRelations = relations(
  superadminUserPermissions,
  ({ one }) => ({
    superadminUser: one(superadminUsers, {
      fields: [superadminUserPermissions.superadminUserId],
      references: [superadminUsers.id],
    }),
    permission: one(permissions, {
      fields: [superadminUserPermissions.permissionId],
      references: [permissions.id],
    }),
    createdByUser: one(users, {
      fields: [superadminUserPermissions.createdBy],
      references: [users.id],
    }),
  })
)

// ============================================================================
// AUDIT LOGS RELATIONS
// ============================================================================

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, {
    fields: [auditLogs.userId],
    references: [users.id],
  }),
}))

// ============================================================================
// ADMIN INVITATIONS RELATIONS
// ============================================================================

export const adminInvitationsRelations = relations(adminInvitations, ({ one }) => ({
  user: one(users, {
    fields: [adminInvitations.userId],
    references: [users.id],
  }),
  managementCompany: one(managementCompanies, {
    fields: [adminInvitations.managementCompanyId],
    references: [managementCompanies.id],
  }),
  createdByUser: one(users, {
    fields: [adminInvitations.createdBy],
    references: [users.id],
    relationName: 'invitationCreator',
  }),
}))

// ============================================================================
// SUBSCRIPTIONS & MEMBERS RELATIONS
// ============================================================================

export const managementCompanySubscriptionsRelations = relations(
  managementCompanySubscriptions,
  ({ one, many }) => ({
    managementCompany: one(managementCompanies, {
      fields: [managementCompanySubscriptions.managementCompanyId],
      references: [managementCompanies.id],
    }),
    currency: one(currencies, {
      fields: [managementCompanySubscriptions.currencyId],
      references: [currencies.id],
    }),
    createdByUser: one(users, {
      fields: [managementCompanySubscriptions.createdBy],
      references: [users.id],
      relationName: 'subscriptionCreator',
    }),
    cancelledByUser: one(users, {
      fields: [managementCompanySubscriptions.cancelledBy],
      references: [users.id],
      relationName: 'subscriptionCanceller',
    }),
    invoices: many(subscriptionInvoices),
  })
)

export const subscriptionInvoicesRelations = relations(subscriptionInvoices, ({ one }) => ({
  subscription: one(managementCompanySubscriptions, {
    fields: [subscriptionInvoices.subscriptionId],
    references: [managementCompanySubscriptions.id],
  }),
  managementCompany: one(managementCompanies, {
    fields: [subscriptionInvoices.managementCompanyId],
    references: [managementCompanies.id],
  }),
  currency: one(currencies, {
    fields: [subscriptionInvoices.currencyId],
    references: [currencies.id],
  }),
  payment: one(payments, {
    fields: [subscriptionInvoices.paymentId],
    references: [payments.id],
  }),
}))

export const managementCompanyMembersRelations = relations(
  managementCompanyMembers,
  ({ one, many }) => ({
    managementCompany: one(managementCompanies, {
      fields: [managementCompanyMembers.managementCompanyId],
      references: [managementCompanies.id],
    }),
    user: one(users, {
      fields: [managementCompanyMembers.userId],
      references: [users.id],
    }),
    invitedByUser: one(users, {
      fields: [managementCompanyMembers.invitedBy],
      references: [users.id],
      relationName: 'memberInviter',
    }),
    deactivatedByUser: one(users, {
      fields: [managementCompanyMembers.deactivatedBy],
      references: [users.id],
      relationName: 'memberDeactivator',
    }),
    createdTickets: many(supportTickets),
  })
)

// ============================================================================
// SUPPORT TICKETS RELATIONS
// ============================================================================

export const supportTicketsRelations = relations(supportTickets, ({ one, many }) => ({
  managementCompany: one(managementCompanies, {
    fields: [supportTickets.managementCompanyId],
    references: [managementCompanies.id],
  }),
  createdByUser: one(users, {
    fields: [supportTickets.createdByUserId],
    references: [users.id],
    relationName: 'ticketCreator',
  }),
  createdByMember: one(managementCompanyMembers, {
    fields: [supportTickets.createdByMemberId],
    references: [managementCompanyMembers.id],
  }),
  resolvedByUser: one(users, {
    fields: [supportTickets.resolvedBy],
    references: [users.id],
    relationName: 'ticketResolver',
  }),
  closedByUser: one(users, {
    fields: [supportTickets.closedBy],
    references: [users.id],
    relationName: 'ticketCloser',
  }),
  messages: many(supportTicketMessages),
}))

export const supportTicketMessagesRelations = relations(supportTicketMessages, ({ one }) => ({
  ticket: one(supportTickets, {
    fields: [supportTicketMessages.ticketId],
    references: [supportTickets.id],
  }),
  user: one(users, {
    fields: [supportTicketMessages.userId],
    references: [users.id],
  }),
}))
