import type { TPayment, TPaymentCreate, TGatewayType } from '@packages/domain'
import type {
  PaymentsRepository,
  PaymentGatewaysRepository,
  EntityPaymentGatewaysRepository,
  GatewayTransactionsRepository,
} from '@database/repositories'
import type { PaymentGatewayManager } from '../payment-gateways/gateway-manager'
import { type TServiceResult, success, failure } from '../base.service'
import logger from '@packages/logger'

const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000000'

export interface IReportPaymentInput {
  paymentData: TPaymentCreate
  registeredByUserId: string
  /** Bank reference or receipt number for auto-verification */
  externalReference?: string
  /** Condominium ID to look up configured gateways */
  condominiumId?: string
}

export interface IReportPaymentOutput {
  payment: TPayment
  autoVerified: boolean
}

/**
 * Service for reporting external payments.
 *
 * When a bank gateway is configured for the condominium:
 * 1. Creates payment with 'pending_verification'
 * 2. Immediately calls the bank API to verify the reference
 * 3. If verified → auto-transitions to 'completed' (no admin needed)
 * 4. If not found → stays 'pending_verification' (admin reviews manually)
 *
 * Creates a gateway_transaction record for audit regardless of outcome.
 */
export class ReportPaymentService {
  constructor(
    private readonly repository: PaymentsRepository,
    private readonly paymentGatewaysRepository?: PaymentGatewaysRepository,
    private readonly entityPaymentGatewaysRepository?: EntityPaymentGatewaysRepository,
    private readonly gatewayTransactionsRepository?: GatewayTransactionsRepository,
    private readonly gatewayManager?: PaymentGatewayManager,
  ) {}

  async execute(input: IReportPaymentInput): Promise<TServiceResult<IReportPaymentOutput>> {
    // 0. Duplicate reference detection — reject if same receiptNumber already exists
    const receiptNumber = input.paymentData.receiptNumber
    if (receiptNumber) {
      const existing = await this.repository.getByReceiptNumber(receiptNumber)
      if (existing.length > 0) {
        return failure(
          `Ya existe un pago registrado con la referencia "${receiptNumber}". ` +
          `Si este es un pago diferente, por favor verifica el número de referencia.`,
          'CONFLICT'
        )
      }
    }

    // 1. Create payment with pending_verification
    const paymentData: TPaymentCreate = {
      ...input.paymentData,
      status: 'pending_verification',
      registeredBy: input.registeredByUserId,
    }

    let payment = await this.repository.create(paymentData)
    let autoVerified = false

    // 2. Attempt synchronous verification if gateway is configured
    if (
      input.externalReference &&
      input.condominiumId &&
      this.entityPaymentGatewaysRepository &&
      this.paymentGatewaysRepository &&
      this.gatewayTransactionsRepository &&
      this.gatewayManager
    ) {
      try {
        autoVerified = await this.attemptVerification(
          payment,
          input.externalReference,
          input.condominiumId
        )

        if (autoVerified) {
          // Re-fetch payment to get updated status
          const updated = await this.repository.getById(payment.id)
          if (updated) payment = updated
        }
      } catch (error) {
        // Bank unavailable, timeout, network error — payment stays pending_verification
        // Admin will need to verify manually or retry later
        logger.error(
          { error, paymentId: payment.id },
          '[ReportPayment] Auto-verification failed (bank unavailable), payment stays pending_verification'
        )

        // Record the failed attempt for audit trail
        await this.recordFailedVerification(
          payment.id,
          input.externalReference,
          input.condominiumId,
          error,
        )
      }
    }

    return success({ payment, autoVerified })
  }

  private async attemptVerification(
    payment: TPayment,
    externalReference: string,
    condominiumId: string
  ): Promise<boolean> {
    // Find gateway configured for this condominium
    const entityGateways = await this.entityPaymentGatewaysRepository!.getByCondominiumId(condominiumId)
    const activeGateway = entityGateways.find(eg => eg.isActive)

    if (!activeGateway) return false

    const gateway = await this.paymentGatewaysRepository!.getById(activeGateway.paymentGatewayId)
    if (!gateway || !gateway.isActive) return false

    if (!this.gatewayManager!.hasAdapter(gateway.gatewayType)) return false

    const adapter = this.gatewayManager!.getAdapter(gateway.gatewayType)
    const config = (gateway.configuration as Record<string, unknown>) ?? {}

    // Validate gateway configuration before calling external API
    const configValidation = adapter.validateConfiguration(config)
    if (!configValidation.valid) {
      logger.warn(
        { paymentId: payment.id, gatewayType: gateway.gatewayType, missingFields: configValidation.missingFields },
        '[ReportPayment] Gateway configuration incomplete — skipping auto-verification'
      )
      return false
    }

    // Call the bank API to verify the reference
    const verification = await adapter.verifyPayment({
      paymentId: payment.id,
      externalReference,
      gatewayConfiguration: config,
    })

    // Check amount mismatch before deciding final status
    let amountMismatch = false
    let mismatchMessage: string | null = null

    if (verification.found && verification.status === 'completed') {
      const reportedAmount = parseFloat(payment.amount)
      const verifiedAmount = verification.verifiedAmount
        ? parseFloat(verification.verifiedAmount)
        : null

      if (verifiedAmount !== null && Math.abs(verifiedAmount - reportedAmount) > 0.01) {
        amountMismatch = true
        mismatchMessage =
          `Amount mismatch: reported ${reportedAmount.toFixed(2)}, ` +
          `bank verified ${verifiedAmount.toFixed(2)} ` +
          `(difference: ${Math.abs(verifiedAmount - reportedAmount).toFixed(2)})`
      }
    }

    // Determine gateway transaction status:
    // - Bank says completed but amounts don't match → completed (bank-side truth) with error note
    // - Bank says completed and amounts match → completed
    // - Bank says failed → failed
    // - Reference not found → failed (verification unsuccessful)
    const txStatus = verification.status === 'failed' ? 'failed'
      : verification.found ? 'completed'
      : 'failed'

    const txErrorMessage = amountMismatch
      ? mismatchMessage
      : verification.found
        ? null
        : verification.errorMessage ?? 'Reference not found in bank'

    // Create gateway transaction record (audit trail)
    await this.gatewayTransactionsRepository!.create({
      paymentId: payment.id,
      gatewayType: gateway.gatewayType,
      externalTransactionId: verification.externalTransactionId ?? null,
      externalReference,
      requestPayload: { reference: externalReference, condominiumId },
      responsePayload: verification.rawResponse,
      status: txStatus,
      attempts: 1,
      maxAttempts: 1,
      lastAttemptAt: new Date(),
      verifiedAt: verification.found ? new Date() : null,
      errorMessage: txErrorMessage,
    })

    // Amount mismatch — flag for admin conciliation, do NOT auto-verify
    if (amountMismatch) {
      logger.warn(
        {
          paymentId: payment.id,
          mismatchMessage,
        },
        '[ReportPayment] Amount mismatch — payment flagged for manual conciliation'
      )
      return false
    }

    // Auto-verify if bank confirmed the payment
    if (verification.found && verification.status === 'completed') {
      await this.repository.verifyPayment(payment.id, SYSTEM_USER_ID, 'Auto-verified via bank gateway')
      return true
    }

    return false
  }

  /**
   * Records a failed verification attempt (bank unavailable, timeout, etc.)
   * for audit trail. The payment stays as pending_verification for manual review.
   */
  private async recordFailedVerification(
    paymentId: string,
    externalReference: string,
    condominiumId: string,
    error: unknown,
  ): Promise<void> {
    try {
      // Try to resolve the gateway type for the audit record
      const entityGateways = await this.entityPaymentGatewaysRepository!.getByCondominiumId(condominiumId)
      const activeGateway = entityGateways.find(eg => eg.isActive)
      let gatewayType: TGatewayType = 'other'

      if (activeGateway) {
        const gw = await this.paymentGatewaysRepository!.getById(activeGateway.paymentGatewayId)
        if (gw) gatewayType = gw.gatewayType
      }

      await this.gatewayTransactionsRepository!.create({
        paymentId,
        gatewayType,
        externalTransactionId: null,
        externalReference,
        requestPayload: { reference: externalReference, condominiumId },
        responsePayload: { error: String(error) },
        status: 'failed',
        attempts: 1,
        maxAttempts: 1,
        lastAttemptAt: new Date(),
        verifiedAt: null,
        errorMessage: 'Bank unavailable during verification attempt',
      })
    } catch (auditError) {
      // Don't let audit recording failure affect the main flow
      logger.error(
        { auditError, paymentId },
        '[ReportPayment] Failed to record verification audit trail'
      )
    }
  }
}
