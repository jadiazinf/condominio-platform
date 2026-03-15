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
 * Required configuration fields for Stripe gateway.
 * Stored in `payment_gateways.configuration` JSONB column.
 */
const REQUIRED_CONFIG_FIELDS = ['secretKey', 'publishableKey', 'webhookSecret'] as const

/**
 * Adapter for Stripe payment processing.
 *
 * STUB IMPLEMENTATION — All methods return simulated responses.
 * When Stripe Atlas is set up and the Stripe SDK is installed,
 * replace the stubs with real Stripe API calls.
 *
 * Expected configuration:
 * {
 *   secretKey: string          // Stripe secret key (sk_live_... or sk_test_...)
 *   publishableKey: string     // Stripe publishable key
 *   webhookSecret: string      // Stripe webhook signing secret (whsec_...)
 *   accountId?: string         // Connected account ID (optional, for Stripe Connect)
 * }
 */
export class StripePaymentAdapter implements IPaymentGatewayAdapter {
  readonly gatewayType: TGatewayType = 'stripe'

  validateConfiguration(config: Record<string, unknown>): IGatewayConfigValidationResult {
    const missingFields = REQUIRED_CONFIG_FIELDS.filter(field => !config[field])
    return {
      valid: missingFields.length === 0,
      missingFields: [...missingFields],
    }
  }

  validateWebhookSignature(input: IGatewayWebhookSignatureInput): IGatewayWebhookSignatureResult {
    // SECURITY STUB — Replace with real Stripe signature verification before production.
    //
    // Real implementation:
    //   import Stripe from 'stripe'
    //   const stripe = new Stripe(input.gatewayConfiguration.secretKey as string)
    //   try {
    //     stripe.webhooks.constructEvent(
    //       input.rawBody,
    //       input.headers['stripe-signature'],
    //       input.gatewayConfiguration.webhookSecret as string,
    //     )
    //     return { valid: true }
    //   } catch (err) {
    //     return { valid: false, reason: (err as Error).message }
    //   }
    const hasWebhookSecret = !!input.gatewayConfiguration.webhookSecret
    const hasSignatureHeader = !!input.headers['stripe-signature']
    if (!hasWebhookSecret) {
      return { valid: false, reason: 'No webhookSecret configured for Stripe gateway' }
    }
    if (!hasSignatureHeader) {
      return { valid: false, reason: 'Missing stripe-signature header' }
    }
    return { valid: true }
  }

  async initiatePayment(
    request: IGatewayPaymentRequest,
    _config: Record<string, unknown>
  ): Promise<IGatewayPaymentResponse> {
    // TODO: Replace with real Stripe Checkout Session creation
    //   const stripe = new Stripe(config.secretKey as string)
    //   const session = await stripe.checkout.sessions.create({
    //     mode: 'payment',
    //     line_items: [{ price_data: { ... }, quantity: 1 }],
    //     success_url: request.returnUrl + '?session_id={CHECKOUT_SESSION_ID}',
    //     cancel_url: request.returnUrl + '?cancelled=true',
    //     metadata: { paymentId: request.paymentId },
    //   })
    const mockSessionId = `cs_stub_${Date.now()}`
    return {
      externalTransactionId: mockSessionId,
      externalReference: mockSessionId,
      status: 'initiated',
      redirectUrl: `https://checkout.stripe.com/stub/${mockSessionId}`,
      rawResponse: {
        stub: true,
        message: 'Stub: Stripe checkout session created',
        sessionId: mockSessionId,
        paymentId: request.paymentId,
        amount: request.amount,
      },
    }
  }

  async verifyPayment(
    request: IGatewayVerificationRequest
  ): Promise<IGatewayVerificationResponse> {
    // TODO: Replace with real Stripe session/payment intent retrieval
    //   const stripe = new Stripe(config.secretKey as string)
    //   const session = await stripe.checkout.sessions.retrieve(request.externalReference)
    //   return { found: session.payment_status === 'paid', ... }
    return {
      found: true,
      status: 'completed',
      externalTransactionId: `pi_stub_${Date.now()}`,
      verifiedAt: new Date(),
      rawResponse: {
        stub: true,
        message: 'Stub: Stripe payment verified',
        reference: request.externalReference,
      },
    }
  }

  async getTransactionStatus(
    request: IGatewayStatusRequest
  ): Promise<IGatewayVerificationResponse> {
    // TODO: Replace with real Stripe PaymentIntent retrieval
    return {
      found: true,
      status: 'completed',
      externalTransactionId: request.externalTransactionId,
      verifiedAt: new Date(),
      rawResponse: {
        stub: true,
        message: 'Stub: Stripe transaction status retrieved',
      },
    }
  }

  async processWebhook(
    payload: IGatewayWebhookPayload
  ): Promise<IGatewayWebhookResult> {
    // TODO: Replace with real Stripe webhook event handling
    //   const stripe = new Stripe(config.secretKey as string)
    //   const event = stripe.webhooks.constructEvent(...)
    //   switch(event.type) { case 'checkout.session.completed': ... }
    const body = payload.body as Record<string, unknown>
    const data = (body?.data as Record<string, unknown>) ?? {}
    const object = (data?.object as Record<string, unknown>) ?? {}
    const metadata = (object?.metadata as Record<string, unknown>) ?? {}

    return {
      paymentId: (metadata?.paymentId as string) ?? null,
      externalTransactionId: (object?.payment_intent as string) ?? `pi_webhook_stub_${Date.now()}`,
      status: 'completed',
      rawPayload: {
        stub: true,
        message: 'Stub: Stripe webhook processed',
        eventType: body?.type ?? 'checkout.session.completed',
      },
    }
  }

  async refund(
    request: IGatewayRefundRequest
  ): Promise<IGatewayRefundResponse> {
    // TODO: Replace with real Stripe refund
    //   const stripe = new Stripe(config.secretKey as string)
    //   const refund = await stripe.refunds.create({
    //     payment_intent: request.externalTransactionId,
    //     amount: Math.round(parseFloat(request.amount) * 100),
    //   })
    return {
      refundId: `re_stub_${Date.now()}`,
      status: 'initiated',
      rawResponse: {
        stub: true,
        message: 'Stub: Stripe refund initiated',
        originalTransaction: request.externalTransactionId,
        amount: request.amount,
      },
    }
  }
}
