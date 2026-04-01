import { pgEnum } from 'drizzle-orm/pg-core'

// ============================================================================
// CORE ENUMS
// ============================================================================

export const locationTypeEnum = pgEnum('location_type', ['country', 'province', 'city'])

export const ownershipTypeEnum = pgEnum('ownership_type', [
  'owner',
  'co-owner',
  'tenant',
  'family_member',
  'authorized',
])

// ============================================================================
// PAYMENT ENUMS
// ============================================================================

export const conceptTypeEnum = pgEnum('concept_type', [
  'maintenance',
  'condominium_fee',
  'extraordinary',
  'fine',
  'reserve_fund',
  'other',
])

export const interestTypeEnum = pgEnum('interest_type', ['simple', 'compound', 'fixed_amount'])

export const quotaStatusEnum = pgEnum('quota_status', [
  'pending',
  'partial',
  'paid',
  'overdue',
  'cancelled',
  'exonerated',
])

export const gatewayTypeEnum = pgEnum('gateway_type', [
  'stripe',
  'banco_plaza',
  'bnc',
  'paypal',
  'zelle',
  'other',
])

export const paymentMethodEnum = pgEnum('payment_method', [
  'transfer',
  'cash',
  'card',
  'mobile_payment',
  'gateway',
  'other',
])

export const paymentStatusEnum = pgEnum('payment_status', [
  'pending',
  'pending_verification',
  'completed',
  'failed',
  'refunded',
  'rejected',
])

// ============================================================================
// EXPENSE ENUMS
// ============================================================================

export const expenseStatusEnum = pgEnum('expense_status', [
  'pending',
  'approved',
  'rejected',
  'paid',
])

// ============================================================================
// DOCUMENT ENUMS
// ============================================================================

export const documentTypeEnum = pgEnum('document_type', [
  'invoice',
  'receipt',
  'statement',
  'contract',
  'regulation',
  'minutes',
  'other',
])

// ============================================================================
// MESSAGE ENUMS
// ============================================================================

export const recipientTypeEnum = pgEnum('recipient_type', [
  'user',
  'condominium',
  'building',
  'unit',
])

export const messageTypeEnum = pgEnum('message_type', ['message', 'notification', 'announcement'])

export const priorityEnum = pgEnum('priority', ['low', 'normal', 'high', 'urgent'])

// ============================================================================
// AUDIT ENUMS
// ============================================================================

export const auditActionEnum = pgEnum('audit_action', ['INSERT', 'UPDATE', 'DELETE'])

// ============================================================================
// NOTIFICATION ENUMS
// ============================================================================

export const notificationCategoryEnum = pgEnum('notification_category', [
  'payment',
  'quota',
  'announcement',
  'reminder',
  'alert',
  'system',
])

export const notificationChannelEnum = pgEnum('notification_channel', ['in_app', 'email', 'push'])

export const devicePlatformEnum = pgEnum('device_platform', ['web', 'ios', 'android'])

export const deliveryStatusEnum = pgEnum('delivery_status', [
  'pending',
  'sent',
  'delivered',
  'failed',
  'bounced',
])

// ============================================================================
// QUOTA GENERATION ENUMS
// ============================================================================

export const adjustmentTypeEnum = pgEnum('adjustment_type', [
  'discount',
  'increase',
  'correction',
  'waiver',
  'exoneration',
  'credit_note',
])

export const formulaTypeEnum = pgEnum('formula_type', ['fixed', 'expression', 'per_unit'])

export const frequencyTypeEnum = pgEnum('frequency_type', [
  'days',
  'monthly',
  'quarterly',
  'semi_annual',
  'annual',
])

export const generationMethodEnum = pgEnum('generation_method', [
  'manual_single',
  'manual_batch',
  'scheduled',
  'range',
  'bulk',
])

export const generationStatusEnum = pgEnum('generation_status', ['completed', 'partial', 'failed'])

export const allocationStatusEnum = pgEnum('allocation_status', [
  'pending',
  'allocated',
  'refunded',
  'refund_pending',
  'refund_failed',
])

// ============================================================================
// ADMIN INVITATION ENUMS
// ============================================================================

export const adminInvitationStatusEnum = pgEnum('admin_invitation_status', [
  'pending',
  'accepted',
  'expired',
  'cancelled',
])

// ============================================================================
// SUBSCRIPTION ENUMS
// ============================================================================

export const subscriptionStatusEnum = pgEnum('subscription_status', [
  'trial',
  'active',
  'inactive',
  'cancelled',
  'suspended',
])

export const billingCycleEnum = pgEnum('billing_cycle', [
  'monthly',
  'quarterly',
  'semi_annual',
  'annual',
  'custom',
])

export const discountTypeEnum = pgEnum('discount_type', ['percentage', 'fixed'])

export const invoiceStatusEnum = pgEnum('invoice_status', [
  'draft',
  'sent',
  'pending',
  'paid',
  'overdue',
  'cancelled',
  'refunded',
])

export const memberRoleEnum = pgEnum('member_role', ['admin', 'accountant', 'support', 'viewer'])

// ============================================================================
// SUPPORT TICKET ENUMS
// ============================================================================

export const ticketPriorityEnum = pgEnum('ticket_priority', ['low', 'medium', 'high', 'urgent'])

export const ticketStatusEnum = pgEnum('ticket_status', [
  'open',
  'in_progress',
  'waiting_customer',
  'resolved',
  'closed',
  'cancelled',
])

export const ticketCategoryEnum = pgEnum('ticket_category', [
  'technical',
  'billing',
  'feature_request',
  'general',
  'bug',
  'maintenance',
  'payment_issue',
  'access_request',
  'noise_complaint',
])

export const ticketChannelEnum = pgEnum('ticket_channel', [
  'resident_to_admin',
  'resident_to_support',
  'admin_to_support',
])

// ============================================================================
// SUBSCRIPTION AUDIT ENUMS
// ============================================================================

export const subscriptionAuditActionEnum = pgEnum('subscription_audit_action', [
  'created',
  'activated',
  'deactivated',
  'updated',
  'cancelled',
  'renewed',
  'terms_accepted',
  'price_changed',
])

export const acceptanceStatusEnum = pgEnum('acceptance_status', [
  'pending',
  'accepted',
  'expired',
  'cancelled',
])

// ============================================================================
// RESERVATION ENUMS
// ============================================================================

export const reservationStatusEnum = pgEnum('reservation_status', [
  'pending',
  'approved',
  'rejected',
  'cancelled',
])

// ============================================================================
// ACCESS REQUEST ENUMS
// ============================================================================

export const accessRequestStatusEnum = pgEnum('access_request_status', [
  'pending',
  'approved',
  'rejected',
])

// ============================================================================
// CONDOMINIUM SERVICE ENUMS
// ============================================================================

export const serviceProviderTypeEnum = pgEnum('service_provider_type', [
  'individual',
  'company',
  'cooperative',
  'government',
  'internal',
])

// ============================================================================
// BANK ACCOUNT ENUMS
// ============================================================================

export const bankAccountCategoryEnum = pgEnum('bank_account_category', [
  'national',
  'international',
])

export const veAccountTypeEnum = pgEnum('ve_account_type', ['corriente', 'ahorro', 'divisas'])

// ============================================================================
// PAYMENT CONCEPT ASSIGNMENT ENUMS
// ============================================================================

export const assignmentScopeEnum = pgEnum('assignment_scope', ['condominium', 'building', 'unit'])

export const distributionMethodEnum = pgEnum('distribution_method', [
  'by_aliquot',
  'equal_split',
  'fixed_per_unit',
])

export const chargeAdjustmentTypeEnum = pgEnum('charge_adjustment_type', [
  'percentage',
  'fixed',
  'none',
])

export const chargeGenerationStrategyEnum = pgEnum('charge_generation_strategy', [
  'auto',
  'bulk',
  'manual',
])

// ============================================================================
// BUDGET ENUMS
// ============================================================================

export const budgetStatusEnum = pgEnum('budget_status', ['draft', 'approved', 'active', 'closed'])

export const budgetTypeEnum = pgEnum('budget_type', ['monthly', 'quarterly', 'annual'])

// ============================================================================
// CONDOMINIUM RECEIPT ENUMS
// ============================================================================

export const receiptStatusEnum = pgEnum('receipt_status', ['draft', 'generated', 'sent', 'voided'])

// ============================================================================
// WIZARD DRAFT ENUMS
// ============================================================================

export const wizardTypeEnum = pgEnum('wizard_type', ['payment_concept'])

// ============================================================================
// BANK RECONCILIATION ENUMS
// ============================================================================

export const bankStatementEntryTypeEnum = pgEnum('bank_statement_entry_type', ['credit', 'debit'])

export const bankStatementEntryStatusEnum = pgEnum('bank_statement_entry_status', [
  'unmatched',
  'matched',
  'ignored',
])

export const bankStatementImportStatusEnum = pgEnum('bank_statement_import_status', [
  'processing',
  'completed',
  'failed',
])

export const reconciliationStatusEnum = pgEnum('reconciliation_status', [
  'in_progress',
  'completed',
  'cancelled',
])

export const matchTypeEnum = pgEnum('match_type', ['auto_reference', 'auto_amount_date', 'manual'])

// ============================================================================
// EVENT LOG ENUMS
// ============================================================================

export const eventLogCategoryEnum = pgEnum('event_log_category', [
  'payment',
  'quota',
  'reconciliation',
  'worker',
  'notification',
  'gateway',
  'auth',
  'subscription',
  'receipt',
  'system',
])

export const eventLogLevelEnum = pgEnum('event_log_level', ['info', 'warn', 'error', 'critical'])

export const eventLogResultEnum = pgEnum('event_log_result', ['success', 'failure', 'partial'])

export const eventLogSourceEnum = pgEnum('event_log_source', [
  'api',
  'worker',
  'webhook',
  'cron',
  'system',
])

export const bankPaymentMethodEnum = pgEnum('bank_payment_method', [
  // National (Venezuela)
  'transfer',
  'pago_movil',
  'interbancario',
  // International
  'wire_transfer',
  'ach',
  'zelle',
  'paypal',
  'wise',
  'crypto',
  'other',
])

// ============================================================================
// BILLING CHANNEL ENUMS (Fase 4.7 — Billing Restructure)
// ============================================================================

export const channelTypeEnum = pgEnum('channel_type', ['receipt', 'standalone'])

export const billingFrequencyEnum = pgEnum('billing_frequency', [
  'monthly',
  'quarterly',
  'semi_annual',
  'annual',
  'one_time',
])

export const generationStrategyEnum = pgEnum('generation_strategy', ['auto', 'manual'])

export const feeTypeEnum = pgEnum('fee_type', ['percentage', 'fixed', 'none'])

export const allocationStrategyEnum = pgEnum('allocation_strategy', [
  'fifo',
  'designated',
  'fifo_interest_first',
])

export const chargeCategoryEnum = pgEnum('charge_category', [
  'ordinary',
  'extraordinary',
  'reserve_fund',
  'social_benefits',
  'non_common',
  'fine',
  'interest',
  'late_fee',
  'discount',
  'credit_note',
  'debit_note',
  'other',
])

export const chargeStatusEnum = pgEnum('charge_status', [
  'pending',
  'paid',
  'partial',
  'cancelled',
  'exonerated',
])

export const billingReceiptStatusEnum = pgEnum('billing_receipt_status', [
  'draft',
  'issued',
  'paid',
  'partial',
  'voided',
])

export const ledgerEntryTypeEnum = pgEnum('ledger_entry_type', ['debit', 'credit'])

export const ledgerReferenceTypeEnum = pgEnum('ledger_reference_type', [
  'charge',
  'receipt',
  'payment',
  'interest',
  'late_fee',
  'discount',
  'credit_note',
  'debit_note',
  'adjustment',
  'void_reversal',
])

export const interestCapTypeEnum = pgEnum('interest_cap_type', [
  'percentage_of_principal',
  'fixed',
  'none',
])
