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
 * Adapter for manual payment methods (zelle, paypal, other).
 *
 * These payment methods don't have external API integrations.
 * Payments are reported manually by users and verified by admins.
 * All gateway operations are no-ops or explicit rejections.
 */
export class ManualPaymentAdapter implements IPaymentGatewayAdapter {
  readonly gatewayType: TGatewayType = 'other'

  validateConfiguration(_config: Record<string, unknown>): IGatewayConfigValidationResult {
    // Manual payments don't need external configuration
    return { valid: true, missingFields: [] }
  }

  validateWebhookSignature(_input: IGatewayWebhookSignatureInput): IGatewayWebhookSignatureResult {
    return { valid: false, reason: 'Manual payments do not support webhooks' }
  }

  async initiatePayment(
    _request: IGatewayPaymentRequest,
    _config: Record<string, unknown>
  ): Promise<IGatewayPaymentResponse> {
    return {
      externalTransactionId: null,
      externalReference: null,
      status: 'initiated',
      rawResponse: { message: 'Manual payment — no external initiation required' },
    }
  }

  async verifyPayment(
    _request: IGatewayVerificationRequest
  ): Promise<IGatewayVerificationResponse> {
    return {
      found: false,
      status: 'failed',
      errorMessage: 'Manual payments require admin verification',
      rawResponse: { message: 'Manual payments require admin verification' },
    }
  }

  async getTransactionStatus(
    _request: IGatewayStatusRequest
  ): Promise<IGatewayVerificationResponse> {
    return {
      found: false,
      status: 'failed',
      errorMessage: 'Manual payments do not have external transaction status',
      rawResponse: { message: 'Manual payments do not have external transaction status' },
    }
  }

  async processWebhook(_payload: IGatewayWebhookPayload): Promise<IGatewayWebhookResult> {
    return {
      paymentId: null,
      externalTransactionId: null as unknown as string,
      status: 'failed',
      rawPayload: { message: 'Manual payments do not support webhooks' },
    }
  }

  async refund(_request: IGatewayRefundRequest): Promise<IGatewayRefundResponse> {
    return {
      refundId: null,
      status: 'failed',
      errorMessage: 'Manual payment refunds are handled offline by admin',
      rawResponse: { message: 'Manual payment refunds are handled offline by admin' },
    }
  }
}
