type ChipColor = 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger'

// ─── Tickets ─────────────────────────────────────────────────────────────────

const TICKET_STATUS_COLORS: Record<string, ChipColor> = {
  open: 'primary',
  in_progress: 'warning',
  waiting_customer: 'secondary',
  resolved: 'success',
  closed: 'default',
}

export function getTicketStatusColor(status: string): ChipColor {
  return TICKET_STATUS_COLORS[status] ?? 'default'
}

const TICKET_PRIORITY_COLORS: Record<string, ChipColor> = {
  urgent: 'danger',
  high: 'warning',
  medium: 'primary',
  low: 'default',
}

export function getTicketPriorityColor(priority: string): ChipColor {
  return TICKET_PRIORITY_COLORS[priority] ?? 'default'
}

// ─── Payments ────────────────────────────────────────────────────────────────

const PAYMENT_STATUS_COLORS: Record<string, ChipColor> = {
  pending: 'warning',
  pending_verification: 'secondary',
  completed: 'success',
  failed: 'danger',
  refunded: 'default',
  cancelled: 'default',
  partially_refunded: 'warning',
}

export function getPaymentStatusColor(status: string): ChipColor {
  return PAYMENT_STATUS_COLORS[status] ?? 'default'
}

// ─── Subscription Invoices ───────────────────────────────────────────────────

const INVOICE_STATUS_COLORS: Record<string, ChipColor> = {
  draft: 'default',
  sent: 'secondary',
  pending: 'warning',
  paid: 'success',
  overdue: 'danger',
  cancelled: 'default',
  void: 'default',
}

export function getInvoiceStatusColor(status: string): ChipColor {
  return INVOICE_STATUS_COLORS[status] ?? 'default'
}

// ─── Subscriptions ───────────────────────────────────────────────────────────

const SUBSCRIPTION_STATUS_COLORS: Record<string, ChipColor> = {
  trial: 'secondary',
  active: 'success',
  inactive: 'default',
  cancelled: 'danger',
  suspended: 'warning',
}

export function getSubscriptionStatusColor(status: string): ChipColor {
  return SUBSCRIPTION_STATUS_COLORS[status] ?? 'default'
}
