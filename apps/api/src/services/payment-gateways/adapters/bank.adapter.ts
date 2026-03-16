import type {
  IPaymentGatewayAdapter,
  IGatewayConfigValidationResult,
  IGatewayPaymentRequest,
  IGatewayPaymentResponse,
  IGatewayVerificationRequest,
  IGatewayVerificationResponse,
  IGatewayStatusRequest,
  IGatewayWebhookSignatureInput,
  IGatewayWebhookSignatureResult,
  IGatewayWebhookPayload,
  IGatewayWebhookResult,
  IGatewayRefundRequest,
  IGatewayRefundResponse,
} from './types'
import type { TGatewayType } from '@packages/domain'

/**
 * Required configuration fields for bank gateways.
 * Stored in `payment_gateways.configuration` JSONB column.
 */
const REQUIRED_CONFIG_FIELDS = [
  'bankCode',
  'apiUrl',
  'apiKey',
  'apiSecret',
  'accountNumber',
] as const

/**
 * Adapter for Venezuelan bank integrations (Banco Plaza, Mercantil, Banesco, etc.).
 *
 * STUB IMPLEMENTATION — All methods return simulated responses.
 * When a bank agreement is reached, replace the HTTP calls inside each method
 * with real bank API calls. The interface and contract remain the same.
 *
 * Expected configuration:
 * {
 *   bankCode: string       // e.g. '0138' for Banco Plaza
 *   apiUrl: string         // Bank API endpoint
 *   apiKey: string         // API key or client ID
 *   apiSecret: string      // API secret for HMAC signature verification
 *   accountNumber: string  // Receiving account number
 *   merchantId?: string    // Bank-assigned merchant identifier (optional)
 * }
 */
export class BankPaymentAdapter implements IPaymentGatewayAdapter {
  readonly gatewayType: TGatewayType = 'banco_plaza'

  validateConfiguration(config: Record<string, unknown>): IGatewayConfigValidationResult {
    const missingFields = REQUIRED_CONFIG_FIELDS.filter(field => !config[field])
    return {
      valid: missingFields.length === 0,
      missingFields: [...missingFields],
    }
  }

  validateWebhookSignature(input: IGatewayWebhookSignatureInput): IGatewayWebhookSignatureResult {
    // SECURITY STUB — Replace with real HMAC-SHA256 verification before production.
    //
    // Real implementation:
    //   import { createHmac } from 'crypto'
    //   const expected = createHmac('sha256', input.gatewayConfiguration.apiSecret as string)
    //     .update(input.rawBody)
    //     .digest('hex')
    //   const received = input.headers['x-bank-signature']
    //   if (!received || expected !== received) {
    //     return { valid: false, reason: 'HMAC signature mismatch' }
    //   }
    //   return { valid: true }
    const hasSecret = !!input.gatewayConfiguration.apiSecret
    if (!hasSecret) {
      return { valid: false, reason: 'No apiSecret configured for bank gateway' }
    }
    return { valid: true }
  }

  async initiatePayment(
    request: IGatewayPaymentRequest,
    _config: Record<string, unknown>
  ): Promise<IGatewayPaymentResponse> {
    // TODO: Replace with real bank API call
    // POST to bank API to initiate a payment/charge
    return {
      externalTransactionId: `bank_tx_${Date.now()}`,
      externalReference: `ref_${Date.now()}`,
      status: 'initiated',
      rawResponse: {
        stub: true,
        message: 'Stub: bank payment initiated',
        paymentId: request.paymentId,
        amount: request.amount,
      },
    }
  }

  async verifyPayment(request: IGatewayVerificationRequest): Promise<IGatewayVerificationResponse> {
    // TODO: Replace with real bank API call
    // GET /api/transactions?reference={externalReference}
    return {
      found: true,
      status: 'completed',
      externalTransactionId: `bank_tx_verified_${Date.now()}`,
      verifiedAmount: undefined, // Real API would return the actual amount
      verifiedAt: new Date(),
      rawResponse: {
        stub: true,
        message: 'Stub: payment reference found in bank',
        reference: request.externalReference,
      },
    }
  }

  async getTransactionStatus(
    request: IGatewayStatusRequest
  ): Promise<IGatewayVerificationResponse> {
    // TODO: Replace with real bank API call
    return {
      found: true,
      status: 'completed',
      externalTransactionId: request.externalTransactionId,
      verifiedAt: new Date(),
      rawResponse: {
        stub: true,
        message: 'Stub: transaction status retrieved',
      },
    }
  }

  async processWebhook(payload: IGatewayWebhookPayload): Promise<IGatewayWebhookResult> {
    // TODO: Replace with real bank webhook processing
    const body = payload.body as Record<string, unknown>
    return {
      paymentId: (body?.paymentId as string) ?? null,
      externalTransactionId: (body?.transactionId as string) ?? `bank_webhook_${Date.now()}`,
      status: 'completed',
      rawPayload: {
        stub: true,
        message: 'Stub: bank webhook processed',
        receivedBody: body,
      },
    }
  }

  async refund(request: IGatewayRefundRequest): Promise<IGatewayRefundResponse> {
    // TODO: Replace with real bank API call
    //
    // Real implementation should handle these scenarios:
    //   1. Bank returns success → { status: 'completed', refundId: '...' }
    //   2. Bank accepts but async → { status: 'initiated', refundId: '...' }
    //      (confirmation comes via webhook)
    //   3. Bank in maintenance → throw new Error('Bank unavailable')
    //      OR return { status: 'failed', retryable: true, errorMessage: '...' }
    //   4. Bank rejects → { status: 'failed', retryable: false, errorMessage: '...' }
    return {
      refundId: `bank_refund_${Date.now()}`,
      status: 'initiated',
      retryable: false,
      rawResponse: {
        stub: true,
        message: 'Stub: bank refund initiated, awaiting confirmation',
        originalTransaction: request.externalTransactionId,
        amount: request.amount,
      },
    }
  }
}
