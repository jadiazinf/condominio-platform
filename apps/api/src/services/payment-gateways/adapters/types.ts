import type { TGatewayType, TGatewayTransactionStatus } from '@packages/domain'

// Re-export domain type so consumers don't need to import from two places
export type { TGatewayTransactionStatus }

// ─────────────────────────────────────────────────────────────────────────────
// Configuration Validation
// ─────────────────────────────────────────────────────────────────────────────

export interface IGatewayConfigValidationResult {
  valid: boolean
  missingFields: string[]
}

// ─────────────────────────────────────────────────────────────────────────────
// Initiate Payment
// ─────────────────────────────────────────────────────────────────────────────

export interface IGatewayPaymentRequest {
  paymentId: string
  amount: string
  currencyCode: string
  description?: string
  /** For redirect-based flows (e.g. Stripe Checkout) */
  returnUrl?: string
  metadata?: Record<string, unknown>
}

export interface IGatewayPaymentResponse {
  externalTransactionId: string | null
  externalReference: string | null
  status: TGatewayTransactionStatus
  /** Where to redirect the user (e.g. Stripe Checkout URL) */
  redirectUrl?: string
  rawResponse: Record<string, unknown>
}

// ─────────────────────────────────────────────────────────────────────────────
// Verify Payment
// ─────────────────────────────────────────────────────────────────────────────

export interface IGatewayVerificationRequest {
  paymentId: string
  /** Bank reference number, Stripe session ID, etc. */
  externalReference: string
  gatewayConfiguration: Record<string, unknown>
  /** Bank code of the sender (e.g. '0102' for Venezuela) — used by bank adapters */
  senderBankCode?: string
  /** Date of the transaction — used by bank adapters for narrowing search */
  transactionDate?: string
}

export interface IGatewayVerificationResponse {
  found: boolean
  status: TGatewayTransactionStatus
  externalTransactionId?: string
  verifiedAmount?: string
  verifiedAt?: Date
  /** Whether a failure is transient (bank down, timeout) — caller may retry */
  retryable?: boolean
  /** Human-readable error from the gateway */
  errorMessage?: string
  rawResponse: Record<string, unknown>
}

// ─────────────────────────────────────────────────────────────────────────────
// Transaction Status
// ─────────────────────────────────────────────────────────────────────────────

export interface IGatewayStatusRequest {
  externalTransactionId: string
  gatewayConfiguration: Record<string, unknown>
}

// ─────────────────────────────────────────────────────────────────────────────
// Webhook
// ─────────────────────────────────────────────────────────────────────────────

export interface IGatewayWebhookSignatureInput {
  headers: Record<string, string>
  rawBody: string
  gatewayConfiguration: Record<string, unknown>
}

export interface IGatewayWebhookSignatureResult {
  valid: boolean
  /** Reason for rejection (for logging) */
  reason?: string
}

export interface IGatewayWebhookPayload {
  headers: Record<string, string>
  body: unknown
  gatewayConfiguration: Record<string, unknown>
}

export interface IGatewayWebhookResult {
  /** Payment ID resolved from webhook data */
  paymentId: string | null
  externalTransactionId: string
  status: TGatewayTransactionStatus
  rawPayload: Record<string, unknown>
}

// ─────────────────────────────────────────────────────────────────────────────
// Refund
// ─────────────────────────────────────────────────────────────────────────────

export interface IGatewayRefundRequest {
  externalTransactionId: string
  amount: string
  reason?: string
  gatewayConfiguration: Record<string, unknown>
}

export interface IGatewayRefundResponse {
  refundId: string | null
  status: 'initiated' | 'completed' | 'failed'
  /** Whether the failure is transient and can be retried (bank down, timeout, maintenance) */
  retryable?: boolean
  /** Human-readable error message from the gateway */
  errorMessage?: string
  rawResponse: Record<string, unknown>
}

// ─────────────────────────────────────────────────────────────────────────────
// Adapter Interface
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Core interface for all payment gateway adapters.
 *
 * Each adapter is stateless — gateway configuration is passed per-call
 * from the `payment_gateways.configuration` JSONB field.
 *
 * To add a new gateway: create an adapter implementing this interface
 * and register it in PaymentGatewayManager.
 */
export interface IPaymentGatewayAdapter {
  readonly gatewayType: TGatewayType

  /**
   * Validate that the gateway configuration has all required fields.
   * Called before any operation to fail fast with a clear error.
   */
  validateConfiguration(config: Record<string, unknown>): IGatewayConfigValidationResult

  /** Start a payment (e.g. create Stripe checkout, initiate bank transfer) */
  initiatePayment(
    request: IGatewayPaymentRequest,
    config: Record<string, unknown>
  ): Promise<IGatewayPaymentResponse>

  /** Check if a reported payment reference exists in the gateway (bank API lookup) */
  verifyPayment(request: IGatewayVerificationRequest): Promise<IGatewayVerificationResponse>

  /** Query current status of an existing transaction */
  getTransactionStatus(request: IGatewayStatusRequest): Promise<IGatewayVerificationResponse>

  /**
   * Validate webhook signature before processing.
   * Must be called BEFORE processWebhook to prevent forged requests.
   *
   * SECURITY: Stub implementations return { valid: true } when config is present.
   * Real implementations MUST verify HMAC/cryptographic signatures.
   * Do NOT deploy stubs to production without replacing with real verification.
   */
  validateWebhookSignature(input: IGatewayWebhookSignatureInput): IGatewayWebhookSignatureResult

  /** Handle incoming webhook from the gateway */
  processWebhook(payload: IGatewayWebhookPayload): Promise<IGatewayWebhookResult>

  /** Request a refund through the gateway */
  refund(request: IGatewayRefundRequest): Promise<IGatewayRefundResponse>
}
