import type {
  PaymentGatewaysRepository,
  GatewayTransactionsRepository,
  PaymentsRepository,
} from '@database/repositories'
import type { TDrizzleClient } from '@database/repositories/interfaces'
import type { PaymentGatewayManager } from '../payment-gateways/gateway-manager'
import type { SendNotificationService } from '../notifications'
import type { TGatewayType } from '@packages/domain'
import { type TServiceResult, success, failure } from '../base.service'
import logger from '@packages/logger'
import type { EventLogger } from '@packages/services'

const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000000'

/** Maximum age for webhooks — reject anything older than 5 minutes */
const MAX_WEBHOOK_AGE_MS = 5 * 60 * 1000

export interface IProcessWebhookInput {
  gatewayType: TGatewayType
  headers: Record<string, string>
  body: unknown
  /** Raw request body string for signature verification */
  rawBody: string
}

export interface IProcessWebhookOutput {
  paymentId: string | null
  externalTransactionId: string
  status: string
  autoVerified: boolean
}

/**
 * Service for processing incoming payment gateway webhooks.
 *
 * Handles the full lifecycle:
 * 1. Validates gateway type and resolves adapter
 * 2. Delegates signature verification + payload parsing to the adapter
 * 3. Updates gateway_transaction + payment atomically in a DB transaction
 * 4. Sends notification to the payer (fire-and-forget, outside transaction)
 */
export class ProcessWebhookService {
  constructor(
    private readonly db: TDrizzleClient,
    private readonly gatewayManager: PaymentGatewayManager,
    private readonly paymentGatewaysRepository: PaymentGatewaysRepository,
    private readonly gatewayTransactionsRepository: GatewayTransactionsRepository,
    private readonly paymentsRepository: PaymentsRepository,
    private readonly sendNotificationService?: SendNotificationService,
    private readonly eventLogger?: EventLogger
  ) {}

  async execute(input: IProcessWebhookInput): Promise<TServiceResult<IProcessWebhookOutput>> {
    const start = Date.now()
    const result = await this.executeInternal(input)
    const durationMs = Date.now() - start

    if (this.eventLogger) {
      if (result.success) {
        this.eventLogger
          .info({
            category: 'payment',
            event: 'gateway.webhook.received',
            action: 'process_webhook',
            message: `Webhook processed for ${input.gatewayType}: ${result.data.status}${result.data.autoVerified ? ' (auto-verified)' : ''}`,
            module: 'ProcessWebhookService',
            source: 'webhook',
            entityType: 'payment',
            entityId: result.data.paymentId,
            metadata: {
              gatewayType: input.gatewayType,
              externalTransactionId: result.data.externalTransactionId,
              status: result.data.status,
              autoVerified: result.data.autoVerified,
            },
            durationMs,
          })
          .catch(() => {})
      } else {
        this.eventLogger
          .error({
            category: 'payment',
            event: 'gateway.webhook.failed',
            action: 'process_webhook',
            message: `Webhook processing failed for ${input.gatewayType}: ${result.error}`,
            module: 'ProcessWebhookService',
            source: 'webhook',
            errorCode: result.code,
            errorMessage: result.error,
            metadata: { gatewayType: input.gatewayType },
            durationMs,
          })
          .catch(() => {})
      }
    }

    return result
  }

  private async executeInternal(
    input: IProcessWebhookInput
  ): Promise<TServiceResult<IProcessWebhookOutput>> {
    const { gatewayType, headers, body } = input

    if (!this.gatewayManager.hasAdapter(gatewayType)) {
      return failure(`Unknown gateway type: ${gatewayType}`, 'BAD_REQUEST')
    }

    const adapter = this.gatewayManager.getAdapter(gatewayType)

    // Resolve gateway configuration.
    // Priority: if the webhook body contains a paymentId, look up the payment's
    // specific gateway config. This handles multi-tenant scenarios where multiple
    // condominiums use the same gateway type with different credentials.
    // Fallback: first active gateway of this type.
    const config = await this.resolveGatewayConfig(gatewayType, body)
    if (!config) {
      return failure(`No active gateway found for type: ${gatewayType}`, 'NOT_FOUND')
    }

    // Validate gateway configuration
    const configValidation = adapter.validateConfiguration(config)
    if (!configValidation.valid) {
      logger.warn(
        { gatewayType, missingFields: configValidation.missingFields },
        '[Webhook] Gateway configuration incomplete'
      )
      return failure(
        `Gateway configuration incomplete. Missing: ${configValidation.missingFields.join(', ')}`,
        'BAD_REQUEST'
      )
    }

    // Validate webhook signature before processing
    const signatureResult = adapter.validateWebhookSignature({
      headers,
      rawBody: input.rawBody,
      gatewayConfiguration: config,
    })

    if (!signatureResult.valid) {
      logger.warn(
        { gatewayType, reason: signatureResult.reason },
        '[Webhook] Signature validation failed'
      )
      return failure(
        `Webhook signature validation failed: ${signatureResult.reason ?? 'invalid signature'}`,
        'FORBIDDEN'
      )
    }

    // Temporal validation — reject stale webhooks to prevent replay attacks
    const webhookTimestamp = this.extractTimestamp(body, gatewayType)
    if (webhookTimestamp) {
      const age = Date.now() - webhookTimestamp.getTime()
      if (age > MAX_WEBHOOK_AGE_MS) {
        logger.warn(
          {
            gatewayType,
            webhookAge: Math.round(age / 1000),
            maxAgeSeconds: MAX_WEBHOOK_AGE_MS / 1000,
          },
          '[Webhook] Rejected stale webhook'
        )
        return failure('Webhook is too old, rejecting to prevent replay', 'FORBIDDEN')
      }
    }

    // Process webhook through the adapter
    const result = await adapter.processWebhook({
      headers,
      body,
      gatewayConfiguration: config,
    })

    // Resolve paymentId from gateway_transactions if the adapter couldn't determine it.
    // This is the primary resolution path for BNC webhooks: the C2P/VPOS API doesn't
    // support encoding a paymentId in the request, so we match the webhook's bank
    // references against stored externalTransactionId/externalReference values.
    let resolvedPaymentId = result.paymentId
    let matchedGatewayTx: { id: string; paymentId: string; status: string } | null = null

    if (!resolvedPaymentId && result.externalTransactionId) {
      // Try matching by externalTransactionId first (BNC IdTransaction → DestinyBankReference)
      const byTxId = await this.gatewayTransactionsRepository.getByExternalTransactionId(
        result.externalTransactionId
      )
      if (byTxId) {
        resolvedPaymentId = byTxId.paymentId
        matchedGatewayTx = byTxId
      } else {
        // Fallback: try matching by externalReference (BNC Reference → authorization code)
        const byRef = await this.gatewayTransactionsRepository.getByExternalReference(
          result.externalTransactionId
        )
        if (byRef) {
          resolvedPaymentId = byRef.paymentId
          matchedGatewayTx = byRef
        }
      }

      if (resolvedPaymentId) {
        logger.info(
          { gatewayType, resolvedPaymentId, externalTxId: result.externalTransactionId },
          '[Webhook] Resolved paymentId from gateway_transactions'
        )
      }
    }

    logger.info(
      { gatewayType, paymentId: resolvedPaymentId, externalTxId: result.externalTransactionId },
      '[Webhook] Processed'
    )

    // Idempotency: if we already processed this external transaction, skip
    if (matchedGatewayTx && matchedGatewayTx.status === 'completed') {
      logger.info(
        { externalTxId: result.externalTransactionId },
        '[Webhook] Already processed, skipping (idempotent)'
      )
      return success({
        paymentId: resolvedPaymentId,
        externalTransactionId: result.externalTransactionId,
        status: result.status,
        autoVerified: false,
      })
    }

    // If no matchedGatewayTx yet, try the original lookup for non-BNC gateways
    if (!matchedGatewayTx && result.externalTransactionId) {
      const existingTx = await this.gatewayTransactionsRepository.getByExternalReference(
        result.externalTransactionId
      )
      if (existingTx && existingTx.status === 'completed') {
        logger.info(
          { externalTxId: result.externalTransactionId },
          '[Webhook] Already processed, skipping (idempotent)'
        )
        return success({
          paymentId: resolvedPaymentId,
          externalTransactionId: result.externalTransactionId,
          status: result.status,
          autoVerified: false,
        })
      }
    }

    // All DB writes inside a transaction for atomicity
    let autoVerified = false

    await this.db.transaction(async tx => {
      const txGatewayTxRepo = this.gatewayTransactionsRepository.withTx(tx)
      const txPaymentsRepo = this.paymentsRepository.withTx(tx)

      // Update gateway transaction record (audit trail)
      // Use the already-matched transaction if available, otherwise try to find it
      const gatewayTxRecord = matchedGatewayTx
        ? matchedGatewayTx
        : result.externalTransactionId
          ? ((await txGatewayTxRepo.getByExternalTransactionId(result.externalTransactionId)) ??
            (await txGatewayTxRepo.getByExternalReference(result.externalTransactionId)))
          : null

      if (gatewayTxRecord) {
        if (result.status === 'completed') {
          await txGatewayTxRepo.markVerified(gatewayTxRecord.id, result.externalTransactionId)
        } else if (result.status === 'failed') {
          await txGatewayTxRepo.markFailed(gatewayTxRecord.id, 'Webhook reported failure')
        }
      }

      // Auto-verify payment if webhook reports completion
      if (resolvedPaymentId && result.status === 'completed') {
        const payment = await txPaymentsRepo.getById(resolvedPaymentId)
        if (payment && payment.status === 'pending_verification') {
          await txPaymentsRepo.verifyPayment(
            resolvedPaymentId,
            SYSTEM_USER_ID,
            `Auto-verified via ${gatewayType} webhook`
          )
          autoVerified = true
        }
      }

    })

    // Notifications outside transaction (fire-and-forget)
    if (resolvedPaymentId && result.status === 'completed') {
      this.notifyPayer(resolvedPaymentId, gatewayType)
    }
    if (resolvedPaymentId && result.status === 'failed') {
      this.notifyPayerFailure(resolvedPaymentId, gatewayType)
    }

    return success({
      paymentId: resolvedPaymentId,
      externalTransactionId: result.externalTransactionId,
      status: result.status,
      autoVerified,
    })
  }

  /**
   * Resolves the gateway configuration for this webhook.
   *
   * Strategy:
   * 1. Try to extract paymentId from the webhook body
   * 2. If found, look up the payment → use its paymentGatewayId for exact config
   * 3. Fallback: first active gateway of this type (works for single-tenant)
   */
  private async resolveGatewayConfig(
    gatewayType: TGatewayType,
    body: unknown
  ): Promise<Record<string, unknown> | null> {
    // Try to resolve from payment's gateway (multi-tenant safe)
    const webhookBody = body as Record<string, unknown> | null
    const paymentId = this.extractPaymentIdFromBody(webhookBody, gatewayType)

    if (paymentId) {
      const payment = await this.paymentsRepository.getById(paymentId)
      if (payment?.paymentGatewayId) {
        const gateway = await this.paymentGatewaysRepository.getById(payment.paymentGatewayId)
        if (gateway) {
          return (gateway.configuration as Record<string, unknown>) ?? {}
        }
      }
    }

    // Fallback: first active gateway of this type
    const gateways = await this.paymentGatewaysRepository.getByType(gatewayType)
    const gateway = gateways[0]
    if (!gateway) return null

    return (gateway.configuration as Record<string, unknown>) ?? {}
  }

  /**
   * Attempts to extract paymentId from the webhook body.
   * Each gateway has a different payload structure.
   */
  private extractPaymentIdFromBody(
    body: Record<string, unknown> | null,
    gatewayType: TGatewayType
  ): string | null {
    if (!body) return null

    // Stripe: metadata.paymentId inside data.object
    if (gatewayType === 'stripe') {
      const data = body.data as Record<string, unknown> | undefined
      const object = data?.object as Record<string, unknown> | undefined
      const metadata = object?.metadata as Record<string, unknown> | undefined
      return (metadata?.paymentId as string) ?? null
    }

    // Bank / generic: paymentId at top level
    return (body.paymentId as string) ?? null
  }

  /**
   * Extracts a timestamp from the webhook body for temporal validation.
   * Returns null if no timestamp is found (validation is skipped).
   */
  private extractTimestamp(body: unknown, gatewayType: TGatewayType): Date | null {
    const webhookBody = body as Record<string, unknown> | null
    if (!webhookBody) return null

    if (gatewayType === 'stripe') {
      // Stripe events have a `created` field (unix timestamp)
      const created = webhookBody.created as number | undefined
      if (created && typeof created === 'number') {
        return new Date(created * 1000)
      }
    }

    // Bank webhooks: check for a `timestamp` or `createdAt` field
    const timestamp = webhookBody.timestamp ?? webhookBody.createdAt
    if (timestamp && typeof timestamp === 'string') {
      const parsed = new Date(timestamp)
      if (!isNaN(parsed.getTime())) return parsed
    }
    if (timestamp && typeof timestamp === 'number') {
      return new Date(timestamp)
    }

    return null
  }

  private notifyPayer(paymentId: string, gatewayType: TGatewayType): void {
    if (!this.sendNotificationService) return

    this.paymentsRepository
      .getById(paymentId)
      .then(payment => {
        if (!payment) return

        this.sendNotificationService!.execute({
          userId: payment.userId,
          category: 'payment',
          title: 'Pago Verificado',
          body: `Tu pago ha sido verificado automáticamente por ${gatewayType}.`,
          channels: ['in_app', 'push'],
          data: { paymentId, action: 'payment_verified_webhook' },
        }).catch(() => {})
      })
      .catch(() => {})
  }

  private notifyPayerFailure(paymentId: string, gatewayType: TGatewayType): void {
    if (!this.sendNotificationService) return

    this.paymentsRepository
      .getById(paymentId)
      .then(payment => {
        if (!payment) return

        this.sendNotificationService!.execute({
          userId: payment.userId,
          category: 'payment',
          title: 'Pago Fallido',
          body: `Tu pago a través de ${gatewayType} no pudo ser procesado. Por favor intenta nuevamente.`,
          channels: ['in_app', 'push'],
          priority: 'high',
          data: { paymentId, action: 'payment_failed_webhook' },
        }).catch(() => {})
      })
      .catch(() => {})
  }
}
