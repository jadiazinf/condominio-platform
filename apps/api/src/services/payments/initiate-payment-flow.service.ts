import type { TPayment, TPaymentCreate } from '@packages/domain'
import type { PaymentsRepository, GatewayTransactionsRepository } from '@database/repositories'
import type { PaymentGatewayManager } from '../payment-gateways/gateway-manager'
import type { ValidateQuotaSelectionService } from './validate-quota-selection.service'
import type { ApplyPaymentToQuotaService } from '../payment-applications/apply-payment-to-quota.service'
import { type TServiceResult, success, failure } from '../base.service'
import logger from '@utils/logger'

export interface IC2PData {
  debtorBankCode: string
  debtorCellPhone: string
  debtorID: string
  token: string
}

export interface IVPOSData {
  cardType: number
  cardNumber: string
  expiration: number
  cvv: number
  cardHolderName: string
  cardHolderID: number
  accountType: number
}

export interface IInitiatePaymentInput {
  unitId: string
  userId: string
  quotaIds: string[]
  amounts: Record<string, string>
  /** 'c2p' | 'vpos' | 'manual' */
  method: string
  paymentMethod: string
  paymentDate: string
  bankAccountId: string
  receiptNumber?: string
  receiptUrl?: string
  notes?: string
  c2pData?: IC2PData
  vposData?: IVPOSData
}

export interface IInitiatePaymentOutput {
  payment: TPayment
  status: string
  externalTransactionId?: string
  externalReference?: string
  bncErrorCode?: string
  bncErrorMessage?: string
}

/**
 * Orchestrates the complete payment flow:
 *
 * 1. Validates quota selection (delegates to ValidateQuotaSelectionService)
 * 2. Validates bank account is in the common set
 * 3. Creates a payment record
 * 4. For BNC methods (C2P/VPOS): calls the gateway, updates status
 * 5. For manual: creates with pending_verification
 * 6. On BNC success: applies payment to quotas
 */
export class InitiatePaymentFlowService {
  constructor(
    private readonly validateService: ValidateQuotaSelectionService,
    private readonly paymentsRepo: PaymentsRepository,
    private readonly applyPaymentService: ApplyPaymentToQuotaService,
    private readonly gatewayManager: PaymentGatewayManager,
    private readonly gatewayTransactionsRepo: GatewayTransactionsRepository,
  ) {}

  async execute(
    input: IInitiatePaymentInput,
  ): Promise<TServiceResult<IInitiatePaymentOutput>> {
    // 1. Validate quota selection
    const validation = await this.validateService.execute({
      unitId: input.unitId,
      quotaIds: input.quotaIds,
      amounts: input.amounts,
    })

    if (!validation.success) {
      return failure(validation.error, validation.code)
    }

    const { validatedQuotas, total, currencyId, commonBankAccounts } = validation.data

    // 2. Validate bank account is in the common set
    const selectedBank = commonBankAccounts.find(ba => ba.id === input.bankAccountId)
    if (!selectedBank) {
      return failure('La cuenta bancaria seleccionada no es válida para estos conceptos', 'BAD_REQUEST')
    }

    // 3. Duplicate receipt number check (manual flow)
    if (input.receiptNumber) {
      const existing = await this.paymentsRepo.getByReceiptNumber(input.receiptNumber)
      if (existing.length > 0) {
        return failure(
          `Ya existe un pago registrado con la referencia "${input.receiptNumber}"`,
          'CONFLICT',
        )
      }
    }

    // 4. Route to the appropriate flow
    if (input.method === 'manual') {
      return this.handleManualFlow(input, total, currencyId, validatedQuotas)
    }

    if (input.method === 'c2p' || input.method === 'vpos') {
      return this.handleBncFlow(input, total, currencyId, validatedQuotas, selectedBank)
    }

    return failure(`Método de pago no soportado: ${input.method}`, 'BAD_REQUEST')
  }

  private async handleManualFlow(
    input: IInitiatePaymentInput,
    total: string,
    currencyId: string,
    validatedQuotas: { quotaId: string; amount: string }[],
  ): Promise<TServiceResult<IInitiatePaymentOutput>> {
    const paymentData: TPaymentCreate = {
      paymentNumber: null,
      userId: input.userId,
      unitId: input.unitId,
      amount: total,
      currencyId,
      paidAmount: null,
      paidCurrencyId: null,
      exchangeRate: null,
      paymentMethod: input.paymentMethod as TPaymentCreate['paymentMethod'],
      paymentGatewayId: null,
      paymentDetails: {
        quotas: validatedQuotas,
        bankAccountId: input.bankAccountId,
      },
      paymentDate: input.paymentDate,
      status: 'pending_verification',
      receiptUrl: input.receiptUrl ?? null,
      receiptNumber: input.receiptNumber ?? null,
      notes: input.notes ?? null,
      metadata: null,
      registeredBy: input.userId,
    }

    const payment = await this.paymentsRepo.create(paymentData)

    return success({
      payment,
      status: 'pending_verification',
    })
  }

  private async handleBncFlow(
    input: IInitiatePaymentInput,
    total: string,
    currencyId: string,
    validatedQuotas: { quotaId: string; amount: string }[],
    selectedBank: { id: string; bankCode: string; isBnc: boolean },
  ): Promise<TServiceResult<IInitiatePaymentOutput>> {
    // Create payment record first (status: pending)
    const paymentData: TPaymentCreate = {
      paymentNumber: null,
      userId: input.userId,
      unitId: input.unitId,
      amount: total,
      currencyId,
      paidAmount: null,
      paidCurrencyId: null,
      exchangeRate: null,
      paymentMethod: input.paymentMethod as TPaymentCreate['paymentMethod'],
      paymentGatewayId: null,
      paymentDetails: {
        method: input.method,
        quotas: validatedQuotas,
        bankAccountId: input.bankAccountId,
      },
      paymentDate: input.paymentDate,
      status: 'pending',
      receiptUrl: null,
      receiptNumber: null,
      notes: null,
      metadata: null,
      registeredBy: input.userId,
    }

    const payment = await this.paymentsRepo.create(paymentData)

    // Build gateway metadata
    const metadata: Record<string, unknown> = {
      method: input.method,
      terminal: 'TERM0001',
    }

    if (input.method === 'c2p' && input.c2pData) {
      metadata.debtorBankCode = input.c2pData.debtorBankCode
      metadata.debtorCellPhone = input.c2pData.debtorCellPhone
      metadata.debtorID = input.c2pData.debtorID
      metadata.token = input.c2pData.token
    }

    if (input.method === 'vpos' && input.vposData) {
      metadata.cardType = input.vposData.cardType
      metadata.cardNumber = input.vposData.cardNumber
      metadata.expiration = input.vposData.expiration
      metadata.cvv = input.vposData.cvv
      metadata.cardHolderName = input.vposData.cardHolderName
      metadata.cardHolderID = input.vposData.cardHolderID
      metadata.accountType = input.vposData.accountType
    }

    // Call gateway
    const adapter = this.gatewayManager.getAdapter('bnc')
    const gatewayResult = await adapter.initiatePayment(
      {
        paymentId: payment.id,
        amount: total,
        currencyCode: 'VES',
        metadata,
      },
      {},
    )

    // Record gateway transaction (audit)
    await this.gatewayTransactionsRepo.create({
      paymentId: payment.id,
      gatewayType: 'bnc',
      externalTransactionId: gatewayResult.externalTransactionId,
      externalReference: gatewayResult.externalReference,
      requestPayload: { method: input.method },
      responsePayload: gatewayResult.rawResponse,
      status: gatewayResult.status,
      attempts: 1,
      maxAttempts: 1,
      lastAttemptAt: new Date(),
      verifiedAt: gatewayResult.status === 'completed' ? new Date() : null,
      errorMessage: gatewayResult.status === 'failed'
        ? (gatewayResult.rawResponse as Record<string, unknown>).bncMessage as string ?? 'BNC payment failed'
        : null,
    })

    // Handle result
    if (gatewayResult.status === 'completed') {
      // Update payment to completed
      await this.paymentsRepo.update(payment.id, {
        status: 'completed',
        receiptNumber: gatewayResult.externalReference,
      })

      // Apply payment to quotas
      for (const vq of validatedQuotas) {
        await this.applyPaymentService.execute({
          paymentId: payment.id,
          quotaId: vq.quotaId,
          appliedAmount: vq.amount,
          registeredByUserId: input.userId,
        })
      }

      const updatedPayment = await this.paymentsRepo.getById(payment.id)

      return success({
        payment: updatedPayment ?? payment,
        status: 'completed',
        externalTransactionId: gatewayResult.externalTransactionId ?? undefined,
        externalReference: gatewayResult.externalReference ?? undefined,
      })
    }

    // Payment failed
    await this.paymentsRepo.update(payment.id, { status: 'failed' })

    const rawResponse = gatewayResult.rawResponse as Record<string, unknown>

    logger.warn(
      { paymentId: payment.id, bncCode: rawResponse.bncCode },
      '[InitiatePayment] BNC payment failed',
    )

    return failure(
      (rawResponse.bncMessage as string) ?? 'Error al procesar el pago con el banco',
      'BAD_REQUEST',
    )
  }
}
