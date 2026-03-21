import type { TGatewayType } from '@packages/domain'
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
import type { IBncConfig, IBncWebhookPayload } from '@libs/bnc/types'
import { BncApiClient, BncApiError } from '@libs/bnc/bnc-api-client'
import { WorkingKeyManager } from '@libs/bnc/working-key-manager'
import { extractErrorCode, getBncError, requiresReauth } from '@libs/bnc/error-codes'
import logger from '@utils/logger'

/**
 * Adapter for BNC (Banco Nacional de Crédito) ESolutions API v2.1.
 *
 * Supports:
 * - C2P (Cobro a Persona / Pago Móvil): Mobile payment with OTP
 * - VPOS (Virtual Point of Sale): Debit/credit card payments
 * - Account History: Transaction lookup for verification/reconciliation
 * - Webhook (NotificationPush v2.0): Incoming payment notifications
 *
 * The BNC adapter differs from generic bank adapters because it uses:
 * - AES-256-CBC encryption for all request payloads
 * - Daily WorkingKey authentication (expires at midnight UTC-4)
 * - Specific error code handling with auto-reauth on EPIRWK
 *
 * Configuration is sourced from environment variables (not DB JSONB),
 * because BNC credentials are platform-level, not per-condominium.
 */
export class BncPaymentAdapter implements IPaymentGatewayAdapter {
  readonly gatewayType: TGatewayType = 'bnc'
  private readonly client: BncApiClient | null
  private readonly keyManager: WorkingKeyManager | null
  private readonly webhookApiKey: string | null

  constructor(bncConfig?: IBncConfig, webhookApiKey?: string) {
    if (bncConfig) {
      this.client = new BncApiClient(bncConfig)
      this.keyManager = new WorkingKeyManager(() => this.client!.authenticate())
      this.webhookApiKey = webhookApiKey ?? null
    } else {
      this.client = null
      this.keyManager = null
      this.webhookApiKey = null
    }
  }

  /**
   * BNC uses env vars, not per-gateway DB config.
   * Returns valid if the BNC client is initialized.
   */
  validateConfiguration(_config: Record<string, unknown>): IGatewayConfigValidationResult {
    if (!this.client) {
      return {
        valid: false,
        missingFields: ['BNC_API_BASE_URL', 'BNC_CLIENT_GUID', 'BNC_MASTER_KEY', 'BNC_TERMINAL'],
      }
    }

    return { valid: true, missingFields: [] }
  }

  /**
   * Initiates a BNC payment (C2P or VPOS).
   *
   * The payment method is determined by `request.metadata.method`:
   * - 'c2p': Pago Móvil (requires DebtorBankCode, DebtorCellPhone, DebtorID, Token)
   * - 'vpos': Card payment (requires card details)
   *
   * Returns the BNC transaction ID and reference on success.
   * Throws BncApiError with translated error code on failure.
   */
  async initiatePayment(
    request: IGatewayPaymentRequest,
    _config: Record<string, unknown>,
  ): Promise<IGatewayPaymentResponse> {
    this.ensureConfigured()

    const metadata = request.metadata ?? {}
    const method = metadata.method as string

    if (method === 'c2p') {
      return this.initiateC2P(request, metadata)
    }

    if (method === 'vpos') {
      return this.initiateVPOS(request, metadata)
    }

    throw new Error(`Unsupported BNC payment method: ${method}`)
  }

  /**
   * Verifies a payment by searching BNC account history for a matching transaction.
   */
  async verifyPayment(request: IGatewayVerificationRequest): Promise<IGatewayVerificationResponse> {
    this.ensureConfigured()

    try {
      const workingKey = await this.keyManager!.getWorkingKey()
      const accountNumber = request.gatewayConfiguration.accountNumber as string

      if (!accountNumber) {
        return {
          found: false,
          status: 'failed',
          errorMessage: 'No account number configured for verification',
          rawResponse: {},
        }
      }

      const startDate = request.transactionDate ?? new Date().toISOString().slice(0, 10)
      const endDate = startDate

      const entries = await this.client!.getAccountHistory(
        { AccountNumber: accountNumber, StartDate: startDate, EndDate: endDate },
        workingKey,
      )

      const match = entries.find(
        entry => entry.ReferenceA === request.externalReference ||
          entry.ReferenceB === request.externalReference ||
          entry.ControlNumber === request.externalReference,
      )

      if (match) {
        return {
          found: true,
          status: 'completed',
          externalTransactionId: match.ControlNumber,
          verifiedAmount: String(match.Amount),
          verifiedAt: new Date(),
          rawResponse: match as unknown as Record<string, unknown>,
        }
      }

      return {
        found: false,
        status: 'initiated',
        rawResponse: { searchedEntries: entries.length },
      }
    } catch (error) {
      return this.handleVerificationError(error)
    }
  }

  /**
   * Queries transaction status by BNC transaction ID.
   */
  async getTransactionStatus(
    request: IGatewayStatusRequest,
  ): Promise<IGatewayVerificationResponse> {
    this.ensureConfigured()

    // BNC doesn't have a direct "get transaction by ID" endpoint.
    // We search account history for the transaction reference.
    try {
      const workingKey = await this.keyManager!.getWorkingKey()
      const accountNumber = request.gatewayConfiguration.accountNumber as string
      const today = new Date().toISOString().slice(0, 10)

      const entries = await this.client!.getAccountHistory(
        { AccountNumber: accountNumber, StartDate: today, EndDate: today },
        workingKey,
      )

      const match = entries.find(
        entry => entry.ControlNumber === request.externalTransactionId,
      )

      if (match) {
        return {
          found: true,
          status: 'completed',
          externalTransactionId: match.ControlNumber,
          verifiedAmount: String(match.Amount),
          verifiedAt: new Date(),
          rawResponse: match as unknown as Record<string, unknown>,
        }
      }

      return {
        found: false,
        status: 'initiated',
        rawResponse: { message: 'Transaction not found in today\'s history' },
      }
    } catch (error) {
      return this.handleVerificationError(error)
    }
  }

  /**
   * Validates BNC webhook signature using API Key.
   *
   * BNC sends the API key in the `x-api-key` header.
   */
  validateWebhookSignature(input: IGatewayWebhookSignatureInput): IGatewayWebhookSignatureResult {
    const expectedKey = this.webhookApiKey

    if (!expectedKey) {
      return { valid: false, reason: 'BNC webhook API key not configured' }
    }

    const receivedKey = input.headers['x-api-key']

    if (!receivedKey || receivedKey !== expectedKey) {
      return { valid: false, reason: 'Invalid BNC webhook API key' }
    }

    return { valid: true }
  }

  /**
   * Processes an incoming BNC NotificationPush v2.0 webhook.
   *
   * BNC notifies ALL transactions to the account, not just condominium payments.
   * The caller (ProcessWebhookService) handles matching/unmatched logic.
   */
  async processWebhook(payload: IGatewayWebhookPayload): Promise<IGatewayWebhookResult> {
    const body = payload.body as IBncWebhookPayload

    const externalTransactionId = body.DestinyBankReference || body.OriginBankReference || `bnc_wh_${Date.now()}`

    // Try to extract paymentId from Concept field (if we encoded it there)
    const paymentId = this.extractPaymentIdFromConcept(body.Concept) ?? null

    logger.info(`[BNC Webhook] ${body.PaymentType} from bank ${body.OriginBankCode}, amount: ${body.Amount}, ref: ${externalTransactionId}`)

    return {
      paymentId,
      externalTransactionId,
      status: 'completed',
      rawPayload: body as unknown as Record<string, unknown>,
    }
  }

  /**
   * Refunds a C2P transaction via reverseC2P.
   * VPOS refunds are not supported by BNC API.
   */
  async refund(request: IGatewayRefundRequest): Promise<IGatewayRefundResponse> {
    this.ensureConfigured()

    const metadata = request.gatewayConfiguration
    const method = metadata.method as string

    if (method === 'vpos') {
      return {
        refundId: null,
        status: 'failed',
        retryable: false,
        errorMessage: 'VPOS refunds are not supported by BNC API',
        rawResponse: {},
      }
    }

    try {
      const workingKey = await this.keyManager!.getWorkingKey()
      const terminal = metadata.terminal as string || 'TERM0001'

      const result = await this.client!.reverseC2P(
        {
          IdTransactionToReverse: Number(request.externalTransactionId),
          Amount: Number(request.amount),
          Terminal: terminal,
        },
        workingKey,
      )

      return {
        refundId: `bnc_reverse_${request.externalTransactionId}`,
        status: 'completed',
        rawResponse: result as Record<string, unknown>,
      }
    } catch (error) {
      if (error instanceof BncApiError) {
        return {
          refundId: null,
          status: 'failed',
          retryable: error.retryable,
          errorMessage: error.bncMessage,
          rawResponse: { bncCode: error.bncCode },
        }
      }
      throw error
    }
  }

  /**
   * Checks if the BNC API is reachable.
   */
  async healthCheck(): Promise<boolean> {
    if (!this.client) return false
    return this.client.healthCheck()
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Private helpers
  // ─────────────────────────────────────────────────────────────────────────

  private ensureConfigured(): asserts this is this & { client: BncApiClient; keyManager: WorkingKeyManager } {
    if (!this.client || !this.keyManager) {
      throw new Error('BNC no configurado. Contacte al administrador.')
    }
  }

  private async initiateC2P(
    request: IGatewayPaymentRequest,
    metadata: Record<string, unknown>,
  ): Promise<IGatewayPaymentResponse> {
    const workingKey = await this.getWorkingKeyWithRetry()

    try {
      const result = await this.client!.sendC2P(
        {
          DebtorBankCode: Number(metadata.debtorBankCode),
          DebtorCellPhone: metadata.debtorCellPhone as string,
          DebtorID: metadata.debtorID as string,
          Amount: Number(request.amount),
          Token: metadata.token as string,
          Terminal: metadata.terminal as string || 'TERM0001',
        },
        workingKey,
      )

      return {
        externalTransactionId: String(result.IdTransaction),
        externalReference: result.Reference,
        status: 'completed',
        rawResponse: result as unknown as Record<string, unknown>,
      }
    } catch (error) {
      return this.handlePaymentError(error, request, metadata, 'c2p')
    }
  }

  private async initiateVPOS(
    request: IGatewayPaymentRequest,
    metadata: Record<string, unknown>,
  ): Promise<IGatewayPaymentResponse> {
    const workingKey = await this.getWorkingKeyWithRetry()

    try {
      const result = await this.client!.sendVPOS(
        {
          TransactionIdentifier: request.paymentId.slice(0, 20),
          Amount: Number(request.amount),
          idCardType: Number(metadata.cardType) as 1 | 2 | 3,
          CardNumber: Number(metadata.cardNumber),
          dtExpiration: Number(metadata.expiration),
          CardHolderName: metadata.cardHolderName as string,
          CardHolderID: Number(metadata.cardHolderID),
          AccountType: Number(metadata.accountType) as 0 | 10 | 20,
          CVV: Number(metadata.cvv),
          AffiliationNumber: Number(metadata.affiliationNumber),
          OperationRef: request.paymentId.slice(0, 40),
        },
        workingKey,
      )

      return {
        externalTransactionId: String(result.Reference),
        externalReference: result.Code,
        status: result.Status === 'OK' ? 'completed' : 'failed',
        rawResponse: result as unknown as Record<string, unknown>,
      }
    } catch (error) {
      return this.handlePaymentError(error, request, metadata, 'vpos')
    }
  }

  /**
   * Gets the WorkingKey, retrying once on EPIRWK (expired session).
   */
  private async getWorkingKeyWithRetry(): Promise<string> {
    try {
      return await this.keyManager!.getWorkingKey()
    } catch {
      // If initial auth fails, try refreshing
      return await this.keyManager!.refresh()
    }
  }

  private async handlePaymentError(
    error: unknown,
    request: IGatewayPaymentRequest,
    metadata: Record<string, unknown>,
    method: string,
  ): Promise<IGatewayPaymentResponse> {
    if (error instanceof BncApiError) {
      // On EPIRWK, invalidate key and retry once
      if (error.requiresReauth) {
        logger.warn('[BNC] EPIRWK received, re-authenticating and retrying...')
        this.keyManager!.invalidate()

        try {
          const newKey = await this.keyManager!.refresh()

          if (method === 'c2p') {
            const result = await this.client!.sendC2P(
              {
                DebtorBankCode: Number(metadata.debtorBankCode),
                DebtorCellPhone: metadata.debtorCellPhone as string,
                DebtorID: metadata.debtorID as string,
                Amount: Number(request.amount),
                Token: metadata.token as string,
                Terminal: metadata.terminal as string || 'TERM0001',
              },
              newKey,
            )
            return {
              externalTransactionId: String(result.IdTransaction),
              externalReference: result.Reference,
              status: 'completed',
              rawResponse: result as unknown as Record<string, unknown>,
            }
          }
          // VPOS retry would go here if needed
        } catch (retryError) {
          if (retryError instanceof BncApiError) {
            return {
              externalTransactionId: null,
              externalReference: null,
              status: 'failed',
              rawResponse: { bncCode: retryError.bncCode, bncMessage: retryError.bncMessage },
            }
          }
          throw retryError
        }
      }

      return {
        externalTransactionId: null,
        externalReference: null,
        status: 'failed',
        rawResponse: {
          bncCode: error.bncCode,
          bncMessage: error.bncMessage,
          retryable: error.retryable,
        },
      }
    }

    throw error
  }

  private handleVerificationError(error: unknown): IGatewayVerificationResponse {
    if (error instanceof BncApiError) {
      return {
        found: false,
        status: 'failed',
        retryable: error.retryable,
        errorMessage: error.bncMessage,
        rawResponse: { bncCode: error.bncCode },
      }
    }

    return {
      found: false,
      status: 'failed',
      retryable: true,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      rawResponse: {},
    }
  }

  /**
   * Tries to extract a payment ID from the BNC webhook Concept field.
   * We encode the payment ID in the Concept when initiating C2P payments.
   */
  private extractPaymentIdFromConcept(concept?: string): string | undefined {
    if (!concept) return undefined

    // Convention: "PAY:<paymentId>" in the concept
    const match = concept.match(/PAY:([a-zA-Z0-9-]+)/)

    return match?.[1]
  }
}
