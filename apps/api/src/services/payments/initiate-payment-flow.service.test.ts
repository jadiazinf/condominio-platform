import { describe, it, expect, mock, beforeEach } from 'bun:test'
import { InitiatePaymentFlowService } from './initiate-payment-flow.service'

function createMockValidationResult(overrides: Record<string, unknown> = {}) {
  return {
    success: true as const,
    data: {
      validatedQuotas: [
        { quotaId: 'q-1', paymentConceptId: 'concept-1', amount: '1000.00', balance: '1000.00' },
      ],
      total: '1000.00',
      currencyId: 'currency-1',
      commonBankAccounts: [
        {
          id: 'ba-1',
          displayName: 'BNC Principal',
          bankName: 'Banco Nacional de Crédito',
          bankCode: '0191',
          isBnc: true,
          acceptedPaymentMethods: ['transfer', 'pago_movil'],
        },
      ],
      ...overrides,
    },
  }
}

describe('InitiatePaymentFlowService', () => {
  let service: InitiatePaymentFlowService
  let validateService: { execute: ReturnType<typeof mock> }
  let paymentsRepo: {
    create: ReturnType<typeof mock>
    getById: ReturnType<typeof mock>
    getByReceiptNumber: ReturnType<typeof mock>
    update: ReturnType<typeof mock>
  }
  let applyPaymentService: { execute: ReturnType<typeof mock> }
  let gatewayManager: {
    getAdapter: ReturnType<typeof mock>
    hasAdapter: ReturnType<typeof mock>
  }
  let gatewayTransactionsRepo: { create: ReturnType<typeof mock> }

  const mockPayment = {
    id: 'payment-1',
    paymentNumber: 'PAY-001',
    userId: 'user-1',
    unitId: 'unit-1',
    amount: '1000.00',
    currencyId: 'currency-1',
    status: 'pending',
    paymentMethod: 'mobile_payment',
    paymentDate: '2026-03-20',
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  beforeEach(() => {
    validateService = {
      execute: mock(() => Promise.resolve(createMockValidationResult())),
    }
    paymentsRepo = {
      create: mock(() => Promise.resolve(mockPayment)),
      getById: mock(() => Promise.resolve(mockPayment)),
      getByReceiptNumber: mock(() => Promise.resolve([])),
      update: mock(() => Promise.resolve(mockPayment)),
    }
    applyPaymentService = {
      execute: mock(() =>
        Promise.resolve({
          success: true,
          data: { application: {}, quotaUpdated: true, interestReversed: false },
        })
      ),
    }
    gatewayManager = {
      getAdapter: mock(() => ({
        initiatePayment: mock(() =>
          Promise.resolve({
            externalTransactionId: 'bnc-tx-123',
            externalReference: 'REF-456',
            status: 'completed',
            rawResponse: {},
          })
        ),
        healthCheck: mock(() => Promise.resolve(true)),
      })),
      hasAdapter: mock(() => true),
    }
    gatewayTransactionsRepo = {
      create: mock(() => Promise.resolve({})),
    }

    service = new InitiatePaymentFlowService(
      validateService as never,
      paymentsRepo as never,
      applyPaymentService as never,
      gatewayManager as never,
      gatewayTransactionsRepo as never,
    )
  })

  describe('manual payment flow', () => {
    it('should create a pending_verification payment for manual registration', async () => {
      const result = await service.execute({
        unitId: 'unit-1',
        userId: 'user-1',
        quotaIds: ['q-1'],
        amounts: { 'q-1': '1000.00' },
        method: 'manual',
        paymentMethod: 'transfer',
        paymentDate: '2026-03-20',
        receiptNumber: 'REF-123',
        bankAccountId: 'ba-1',
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.status).toBe('pending_verification')
      }
      expect(paymentsRepo.create).toHaveBeenCalledTimes(1)
    })

    it('should reject duplicate receipt numbers', async () => {
      paymentsRepo.getByReceiptNumber.mockResolvedValue([{ id: 'existing-payment' }])

      const result = await service.execute({
        unitId: 'unit-1',
        userId: 'user-1',
        quotaIds: ['q-1'],
        amounts: { 'q-1': '1000.00' },
        method: 'manual',
        paymentMethod: 'transfer',
        paymentDate: '2026-03-20',
        receiptNumber: 'DUPLICATE-REF',
        bankAccountId: 'ba-1',
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe('CONFLICT')
      }
    })
  })

  describe('BNC C2P payment flow', () => {
    it('should initiate C2P payment and apply to quotas on success', async () => {
      const completedPayment = { ...mockPayment, status: 'completed' }
      paymentsRepo.create.mockResolvedValue({ ...mockPayment, status: 'pending' })
      paymentsRepo.update.mockResolvedValue(completedPayment)
      paymentsRepo.getById.mockResolvedValue(completedPayment)

      const result = await service.execute({
        unitId: 'unit-1',
        userId: 'user-1',
        quotaIds: ['q-1'],
        amounts: { 'q-1': '1000.00' },
        method: 'c2p',
        paymentMethod: 'mobile_payment',
        paymentDate: '2026-03-20',
        bankAccountId: 'ba-1',
        c2pData: {
          debtorBankCode: '0102',
          debtorCellPhone: '584121234567',
          debtorID: 'V12345678',
          token: 'ABC12345',
        },
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.status).toBe('completed')
      }
      // Should have called apply payment for each quota
      expect(applyPaymentService.execute).toHaveBeenCalledTimes(1)
      // Should have created a gateway transaction
      expect(gatewayTransactionsRepo.create).toHaveBeenCalledTimes(1)
    })

    it('should mark payment as failed on BNC error', async () => {
      const failedPayment = { ...mockPayment, status: 'failed' }
      paymentsRepo.update.mockResolvedValue(failedPayment)

      const adapter = {
        initiatePayment: mock(() =>
          Promise.resolve({
            externalTransactionId: null,
            externalReference: null,
            status: 'failed',
            rawResponse: { bncCode: 'G51', bncMessage: 'Fondos insuficientes' },
          })
        ),
        healthCheck: mock(() => Promise.resolve(true)),
      }
      gatewayManager.getAdapter.mockReturnValue(adapter)

      const result = await service.execute({
        unitId: 'unit-1',
        userId: 'user-1',
        quotaIds: ['q-1'],
        amounts: { 'q-1': '1000.00' },
        method: 'c2p',
        paymentMethod: 'mobile_payment',
        paymentDate: '2026-03-20',
        bankAccountId: 'ba-1',
        c2pData: {
          debtorBankCode: '0102',
          debtorCellPhone: '584121234567',
          debtorID: 'V12345678',
          token: 'ABC12345',
        },
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe('BAD_REQUEST')
      }
      // Should NOT apply payment
      expect(applyPaymentService.execute).not.toHaveBeenCalled()
    })
  })

  describe('BNC VPOS payment flow', () => {
    it('should initiate VPOS payment', async () => {
      const completedPayment = { ...mockPayment, status: 'completed', paymentMethod: 'card' }
      paymentsRepo.create.mockResolvedValue({ ...mockPayment, status: 'pending' })
      paymentsRepo.update.mockResolvedValue(completedPayment)
      paymentsRepo.getById.mockResolvedValue(completedPayment)

      const result = await service.execute({
        unitId: 'unit-1',
        userId: 'user-1',
        quotaIds: ['q-1'],
        amounts: { 'q-1': '1000.00' },
        method: 'vpos',
        paymentMethod: 'card',
        paymentDate: '2026-03-20',
        bankAccountId: 'ba-1',
        vposData: {
          cardType: 1,
          cardNumber: '4111111111111111',
          expiration: 122028,
          cvv: 123,
          cardHolderName: 'John Doe',
          cardHolderID: 12345678,
          accountType: 0,
        },
      })

      expect(result.success).toBe(true)
    })
  })

  describe('validation', () => {
    it('should fail when quota validation fails', async () => {
      validateService.execute.mockResolvedValue({
        success: false,
        error: 'Cuota no pertenece a esta unidad',
        code: 'BAD_REQUEST',
      })

      const result = await service.execute({
        unitId: 'unit-1',
        userId: 'user-1',
        quotaIds: ['q-1'],
        amounts: { 'q-1': '1000.00' },
        method: 'manual',
        paymentMethod: 'transfer',
        paymentDate: '2026-03-20',
        bankAccountId: 'ba-1',
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe('BAD_REQUEST')
      }
    })

    it('should fail when selected bank account is not in common accounts', async () => {
      validateService.execute.mockResolvedValue(
        createMockValidationResult({
          commonBankAccounts: [
            { id: 'ba-other', displayName: 'Other', bankName: 'Other', bankCode: '0134', isBnc: false, acceptedPaymentMethods: ['transfer'] },
          ],
        })
      )

      const result = await service.execute({
        unitId: 'unit-1',
        userId: 'user-1',
        quotaIds: ['q-1'],
        amounts: { 'q-1': '1000.00' },
        method: 'manual',
        paymentMethod: 'transfer',
        paymentDate: '2026-03-20',
        bankAccountId: 'ba-nonexistent',
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe('BAD_REQUEST')
      }
    })
  })
})
