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
])

export const interestTypeEnum = pgEnum('interest_type', ['simple', 'compound', 'fixed_amount'])

export const quotaStatusEnum = pgEnum('quota_status', ['pending', 'paid', 'overdue', 'cancelled'])

export const gatewayTypeEnum = pgEnum('gateway_type', [
  'stripe',
  'banco_plaza',
  'paypal',
  'zelle',
  'other',
])

export const paymentMethodEnum = pgEnum('payment_method', ['transfer', 'cash', 'card', 'gateway'])

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
])

export const generationStatusEnum = pgEnum('generation_status', ['completed', 'partial', 'failed'])

export const allocationStatusEnum = pgEnum('allocation_status', [
  'pending',
  'allocated',
  'refunded',
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
// BANK ACCOUNT ENUMS
// ============================================================================

export const bankAccountCategoryEnum = pgEnum('bank_account_category', ['national', 'international'])

export const veAccountTypeEnum = pgEnum('ve_account_type', ['corriente', 'ahorro', 'divisas'])

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
