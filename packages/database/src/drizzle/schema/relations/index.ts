import { relations } from 'drizzle-orm'

// Import all tables
import { locations } from '../tables/locations'
import { amenities } from '../tables/amenities'
import { amenityReservations } from '../tables/amenity-reservations'
import { currencies } from '../tables/currencies'
import { exchangeRates } from '../tables/exchange-rates'
import { users } from '../tables/users'
import { permissions } from '../tables/permissions'
import { roles } from '../tables/roles'
import { rolePermissions } from '../tables/role-permissions'
import { userPermissions } from '../tables/user-permissions'
import { managementCompanies } from '../tables/management-companies'
import { condominiums } from '../tables/condominiums'
import { condominiumManagementCompanies } from '../tables/condominium-management-companies'
import { buildings } from '../tables/buildings'
import { userRoles } from '../tables/user-roles'
import { units } from '../tables/units'
import { unitOwnerships } from '../tables/unit-ownerships'
import { interestConfigurations } from '../tables/interest-configurations'
import { paymentGateways, entityPaymentGateways } from '../tables/payment-gateways'
import { payments } from '../tables/payments'
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
import { auditLogs } from '../tables/audit-logs'
import { adminInvitations } from '../tables/admin-invitations'
import { managementCompanySubscriptions } from '../tables/management-company-subscriptions'
import { subscriptionInvoices } from '../tables/subscription-invoices'
import { managementCompanyMembers } from '../tables/management-company-members'
import { supportTickets } from '../tables/support-tickets'
import { supportTicketMessages } from '../tables/support-ticket-messages'
import { bankAccounts } from '../tables/bank-accounts'
import { bankStatementImports } from '../tables/bank-statement-imports'
import { bankStatementEntries } from '../tables/bank-statement-entries'
import { bankReconciliations } from '../tables/bank-reconciliations'
import { bankStatementMatches } from '../tables/bank-statement-matches'
import { eventLogs } from '../tables/event-logs'
import { chargeCategories } from '../tables/charge-categories'
import { chargeTypes } from '../tables/charge-types'
import { charges } from '../tables/charges'
import { receipts } from '../tables/receipts'
import { unitLedgerEntries } from '../tables/unit-ledger-entries'
import { paymentAllocations } from '../tables/payment-allocations'
import { ownershipTransferSnapshots } from '../tables/ownership-transfer-snapshots'
import { assemblyMinutes } from '../tables/assembly-minutes'
import { condominiumBoardMembers } from '../tables/condominium-board-members'

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
  interestConfigurations: many(interestConfigurations),
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
  userPermissions: many(userPermissions),
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
  userPermissions: many(userPermissions),
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

export const userPermissionsRelations = relations(userPermissions, ({ one }) => ({
  user: one(users, {
    fields: [userPermissions.userId],
    references: [users.id],
  }),
  permission: one(permissions, {
    fields: [userPermissions.permissionId],
    references: [permissions.id],
  }),
  assignedByUser: one(users, {
    fields: [userPermissions.assignedBy],
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
  // Many-to-many via junction table
  condominiumAssignments: many(condominiumManagementCompanies),
  adminInvitations: many(adminInvitations),
  subscriptions: many(managementCompanySubscriptions),
  members: many(managementCompanyMembers),
  supportTickets: many(supportTickets),
}))

export const condominiumsRelations = relations(condominiums, ({ one, many }) => ({
  // Many-to-many via junction table
  managementCompanyAssignments: many(condominiumManagementCompanies),
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
  interestConfigurations: many(interestConfigurations),
  entityPaymentGateways: many(entityPaymentGateways),
  expenses: many(expenses),
  documents: many(documents),
  messages: many(messages),
  amenities: many(amenities),
}))

// Junction table relations for condominium-management company many-to-many
export const condominiumManagementCompaniesRelations = relations(
  condominiumManagementCompanies,
  ({ one }) => ({
    condominium: one(condominiums, {
      fields: [condominiumManagementCompanies.condominiumId],
      references: [condominiums.id],
    }),
    managementCompany: one(managementCompanies, {
      fields: [condominiumManagementCompanies.managementCompanyId],
      references: [managementCompanies.id],
    }),
    assignedByUser: one(users, {
      fields: [condominiumManagementCompanies.assignedBy],
      references: [users.id],
    }),
  })
)

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
  interestConfigurations: many(interestConfigurations),
  entityPaymentGateways: many(entityPaymentGateways),
  expenses: many(expenses),
  documents: many(documents),
  messages: many(messages),
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
// INTEREST CONFIGURATIONS RELATIONS
// ============================================================================

export const interestConfigurationsRelations = relations(interestConfigurations, ({ one }) => ({
  condominium: one(condominiums, {
    fields: [interestConfigurations.condominiumId],
    references: [condominiums.id],
  }),
  building: one(buildings, {
    fields: [interestConfigurations.buildingId],
    references: [buildings.id],
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
  documents: many(documents),
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

// ============================================================================
// AMENITIES RELATIONS
// ============================================================================

export const amenitiesRelations = relations(amenities, ({ one, many }) => ({
  condominium: one(condominiums, {
    fields: [amenities.condominiumId],
    references: [condominiums.id],
  }),
  createdByUser: one(users, {
    fields: [amenities.createdBy],
    references: [users.id],
  }),
  reservations: many(amenityReservations),
}))

// ============================================================================
// AMENITY RESERVATIONS RELATIONS
// ============================================================================

export const amenityReservationsRelations = relations(amenityReservations, ({ one }) => ({
  amenity: one(amenities, {
    fields: [amenityReservations.amenityId],
    references: [amenities.id],
  }),
  user: one(users, {
    fields: [amenityReservations.userId],
    references: [users.id],
  }),
  approvedByUser: one(users, {
    fields: [amenityReservations.approvedBy],
    references: [users.id],
    relationName: 'reservationApprover',
  }),
}))

// ============================================================================
// BANK ACCOUNT RELATIONS
// ============================================================================

export const bankAccountsRelations = relations(bankAccounts, ({ one, many }) => ({
  managementCompany: one(managementCompanies, {
    fields: [bankAccounts.managementCompanyId],
    references: [managementCompanies.id],
  }),
  createdByUser: one(users, {
    fields: [bankAccounts.createdBy],
    references: [users.id],
  }),
  statementImports: many(bankStatementImports),
  reconciliations: many(bankReconciliations),
}))

// ============================================================================
// BANK RECONCILIATION RELATIONS
// ============================================================================

export const bankStatementImportsRelations = relations(bankStatementImports, ({ one, many }) => ({
  bankAccount: one(bankAccounts, {
    fields: [bankStatementImports.bankAccountId],
    references: [bankAccounts.id],
  }),
  importedByUser: one(users, {
    fields: [bankStatementImports.importedBy],
    references: [users.id],
  }),
  entries: many(bankStatementEntries),
}))

export const bankStatementEntriesRelations = relations(bankStatementEntries, ({ one }) => ({
  import: one(bankStatementImports, {
    fields: [bankStatementEntries.importId],
    references: [bankStatementImports.id],
  }),
  match: one(bankStatementMatches),
}))

export const bankReconciliationsRelations = relations(bankReconciliations, ({ one }) => ({
  bankAccount: one(bankAccounts, {
    fields: [bankReconciliations.bankAccountId],
    references: [bankAccounts.id],
  }),
  condominium: one(condominiums, {
    fields: [bankReconciliations.condominiumId],
    references: [condominiums.id],
  }),
  reconciledByUser: one(users, {
    fields: [bankReconciliations.reconciledBy],
    references: [users.id],
  }),
}))

export const bankStatementMatchesRelations = relations(bankStatementMatches, ({ one }) => ({
  entry: one(bankStatementEntries, {
    fields: [bankStatementMatches.entryId],
    references: [bankStatementEntries.id],
  }),
  payment: one(payments, {
    fields: [bankStatementMatches.paymentId],
    references: [payments.id],
  }),
  matchedByUser: one(users, {
    fields: [bankStatementMatches.matchedBy],
    references: [users.id],
  }),
}))

// ─── Event Logs ──────────────────────────────────────────────────────
export const eventLogsRelations = relations(eventLogs, ({ one }) => ({
  condominium: one(condominiums, {
    fields: [eventLogs.condominiumId],
    references: [condominiums.id],
  }),
  user: one(users, {
    fields: [eventLogs.userId],
    references: [users.id],
  }),
}))

// ============================================================================
// BILLING RELATIONS (Fase 5 — Direct Monthly Billing)
// ============================================================================

export const chargeCategoriesRelations = relations(chargeCategories, ({ many }) => ({
  chargeTypes: many(chargeTypes),
}))

export const chargeTypesRelations = relations(chargeTypes, ({ one, many }) => ({
  condominium: one(condominiums, {
    fields: [chargeTypes.condominiumId],
    references: [condominiums.id],
  }),
  category: one(chargeCategories, {
    fields: [chargeTypes.categoryId],
    references: [chargeCategories.id],
  }),
  charges: many(charges),
}))

export const chargesRelations = relations(charges, ({ one, many }) => ({
  condominium: one(condominiums, {
    fields: [charges.condominiumId],
    references: [condominiums.id],
  }),
  chargeType: one(chargeTypes, {
    fields: [charges.chargeTypeId],
    references: [chargeTypes.id],
  }),
  unit: one(units, {
    fields: [charges.unitId],
    references: [units.id],
  }),
  receipt: one(receipts, {
    fields: [charges.receiptId],
    references: [receipts.id],
  }),
  currency: one(currencies, {
    fields: [charges.currencyId],
    references: [currencies.id],
  }),
  sourceCharge: one(charges, {
    fields: [charges.sourceChargeId],
    references: [charges.id],
    relationName: 'chargeSourceCharge',
  }),
  derivedCharges: many(charges, { relationName: 'chargeSourceCharge' }),
  createdByUser: one(users, {
    fields: [charges.createdBy],
    references: [users.id],
  }),
  allocations: many(paymentAllocations),
}))

export const receiptsRelations = relations(receipts, ({ one, many }) => ({
  condominium: one(condominiums, {
    fields: [receipts.condominiumId],
    references: [condominiums.id],
  }),
  unit: one(units, {
    fields: [receipts.unitId],
    references: [units.id],
  }),
  currency: one(currencies, {
    fields: [receipts.currencyId],
    references: [currencies.id],
  }),
  parentReceipt: one(receipts, {
    fields: [receipts.parentReceiptId],
    references: [receipts.id],
    relationName: 'receiptParent',
  }),
  childReceipts: many(receipts, { relationName: 'receiptParent' }),
  replacesReceipt: one(receipts, {
    fields: [receipts.replacesReceiptId],
    references: [receipts.id],
    relationName: 'receiptReplacement',
  }),
  replacedByReceipt: many(receipts, { relationName: 'receiptReplacement' }),
  generatedByUser: one(users, {
    fields: [receipts.generatedBy],
    references: [users.id],
  }),
  charges: many(charges),
}))

export const unitLedgerEntriesRelations = relations(unitLedgerEntries, ({ one }) => ({
  unit: one(units, {
    fields: [unitLedgerEntries.unitId],
    references: [units.id],
  }),
  condominium: one(condominiums, {
    fields: [unitLedgerEntries.condominiumId],
    references: [condominiums.id],
  }),
  currency: one(currencies, {
    fields: [unitLedgerEntries.currencyId],
    references: [currencies.id],
  }),
  paymentCurrency: one(currencies, {
    fields: [unitLedgerEntries.paymentCurrencyId],
    references: [currencies.id],
    relationName: 'ledgerPaymentCurrency',
  }),
  exchangeRate: one(exchangeRates, {
    fields: [unitLedgerEntries.exchangeRateId],
    references: [exchangeRates.id],
  }),
  createdByUser: one(users, {
    fields: [unitLedgerEntries.createdBy],
    references: [users.id],
  }),
}))

export const paymentAllocationsRelations = relations(paymentAllocations, ({ one }) => ({
  payment: one(payments, {
    fields: [paymentAllocations.paymentId],
    references: [payments.id],
  }),
  charge: one(charges, {
    fields: [paymentAllocations.chargeId],
    references: [charges.id],
  }),
  createdByUser: one(users, {
    fields: [paymentAllocations.createdBy],
    references: [users.id],
  }),
}))

export const ownershipTransferSnapshotsRelations = relations(
  ownershipTransferSnapshots,
  ({ one }) => ({
    unit: one(units, {
      fields: [ownershipTransferSnapshots.unitId],
      references: [units.id],
    }),
    previousOwner: one(users, {
      fields: [ownershipTransferSnapshots.previousOwnerId],
      references: [users.id],
      relationName: 'transferPreviousOwner',
    }),
    newOwner: one(users, {
      fields: [ownershipTransferSnapshots.newOwnerId],
      references: [users.id],
      relationName: 'transferNewOwner',
    }),
    debtCurrency: one(currencies, {
      fields: [ownershipTransferSnapshots.debtCurrencyId],
      references: [currencies.id],
    }),
    createdByUser: one(users, {
      fields: [ownershipTransferSnapshots.createdBy],
      references: [users.id],
    }),
  })
)

// ============================================================================
// ASSEMBLY MINUTES RELATIONS
// ============================================================================

export const assemblyMinutesRelations = relations(assemblyMinutes, ({ one }) => ({
  condominium: one(condominiums, {
    fields: [assemblyMinutes.condominiumId],
    references: [condominiums.id],
  }),
  createdByUser: one(users, {
    fields: [assemblyMinutes.createdBy],
    references: [users.id],
  }),
}))

// ============================================================================
// CONDOMINIUM BOARD MEMBERS RELATIONS
// ============================================================================

export const condominiumBoardMembersRelations = relations(condominiumBoardMembers, ({ one }) => ({
  condominium: one(condominiums, {
    fields: [condominiumBoardMembers.condominiumId],
    references: [condominiums.id],
  }),
  user: one(users, {
    fields: [condominiumBoardMembers.userId],
    references: [users.id],
  }),
  createdByUser: one(users, {
    fields: [condominiumBoardMembers.createdBy],
    references: [users.id],
    relationName: 'boardMemberCreatedBy',
  }),
}))
