import { describe, it, expect, beforeEach } from 'bun:test'
import { ProcessWebhookService } from '@src/services/webhooks'
import type { IProcessWebhookInput } from '@src/services/webhooks'
import type { TPayment, TGatewayType } from '@packages/domain'

// ─────────────────────────────────────────────────────────────────────────────
// Mock Types
// ─────────────────────────────────────────────────────────────────────────────

type TMockGatewayManager = {
  hasAdapter: (type: TGatewayType) => boolean
  getAdapter: (type: TGatewayType) => TMockAdapter
}

type TMockAdapter = {
  validateConfiguration: (config: Record<string, unknown>) => {
    valid: boolean
    missingFields: string[]
  }
  validateWebhookSignature: (input: unknown) => { valid: boolean; reason?: string }
  processWebhook: (payload: unknown) => Promise<{
    paymentId: string | null
    externalTransactionId: string
    status: string
    rawPayload: Record<string, unknown>
  }>
}

type TMockPaymentGatewaysRepository = {
  getById: (id: string) => Promise<{ id: string; configuration: Record<string, unknown> } | null>
  getByType: (
    type: TGatewayType
  ) => Promise<{ id: string; configuration: Record<string, unknown> }[]>
}

type TMockGatewayTransactionsRepository = {
  getByExternalReference: (ref: string) => Promise<{ id: string; status: string } | null>
  markVerified: (id: string, externalTxId: string) => Promise<void>
  markFailed: (id: string, error: string) => Promise<void>
  withTx: (tx: unknown) => TMockGatewayTransactionsRepository
}

type TMockPaymentsRepository = {
  getById: (id: string) => Promise<TPayment | null>
  verifyPayment: (id: string, verifiedBy: string, notes: string) => Promise<TPayment | null>
  withTx: (tx: unknown) => TMockPaymentsRepository
}

type TMockSendNotificationService = {
  execute: (input: unknown) => Promise<{ success: boolean }>
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const PAYMENT_ID = '550e8400-e29b-41d4-a716-446655440001'
const GATEWAY_TX_ID = '550e8400-e29b-41d4-a716-446655440010'
const EXTERNAL_TX_ID = 'pi_stripe_123456'
const GATEWAY_ID = '550e8400-e29b-41d4-a716-446655440020'
const USER_ID = '550e8400-e29b-41d4-a716-446655440030'

const GATEWAY_CONFIG = { secretKey: 'sk_test_xxx', webhookSecret: 'whsec_xxx' }

const MOCK_PAYMENT = {
  id: PAYMENT_ID,
  userId: USER_ID,
  unitId: '550e8400-e29b-41d4-a716-446655440040',
  amount: '150.00',
  currencyId: '550e8400-e29b-41d4-a716-446655440050',
  paymentMethod: 'transfer',
  paymentGatewayId: GATEWAY_ID,
  status: 'pending_verification',
  paymentDate: '2026-03-01',
} as TPayment

function createStripeWebhookInput(
  overrides: Partial<IProcessWebhookInput> = {}
): IProcessWebhookInput {
  return {
    gatewayType: 'stripe' as TGatewayType,
    headers: { 'stripe-signature': 'sig_test_123' },
    body: {
      type: 'checkout.session.completed',
      data: {
        object: {
          payment_intent: EXTERNAL_TX_ID,
          metadata: { paymentId: PAYMENT_ID },
        },
      },
    },
    rawBody: '{"type":"checkout.session.completed"}',
    ...overrides,
  }
}

function createBankWebhookInput(
  overrides: Partial<IProcessWebhookInput> = {}
): IProcessWebhookInput {
  return {
    gatewayType: 'banco_plaza' as TGatewayType,
    headers: { 'x-bank-signature': 'hmac_test_123' },
    body: {
      paymentId: PAYMENT_ID,
      transactionId: 'bank_tx_789',
      status: 'completed',
    },
    rawBody: '{"paymentId":"...","status":"completed"}',
    ...overrides,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('ProcessWebhookService', function () {
  let service: ProcessWebhookService
  let mockDb: { transaction: <T>(fn: (tx: unknown) => Promise<T>) => Promise<T> }
  let mockGatewayManager: TMockGatewayManager
  let mockAdapter: TMockAdapter
  let mockPaymentGatewaysRepo: TMockPaymentGatewaysRepository
  let mockGatewayTxRepo: TMockGatewayTransactionsRepository
  let mockPaymentsRepo: TMockPaymentsRepository
  let mockNotificationService: TMockSendNotificationService

  // Track calls for assertions
  let verifyPaymentCalls: { id: string; verifiedBy: string; notes: string }[]
  let markVerifiedCalls: { id: string; externalTxId: string }[]
  let markFailedCalls: { id: string; error: string }[]
  let notificationCalls: unknown[]

  beforeEach(function () {
    verifyPaymentCalls = []
    markVerifiedCalls = []
    markFailedCalls = []
    notificationCalls = []

    mockAdapter = {
      validateConfiguration: function () {
        return { valid: true, missingFields: [] }
      },
      validateWebhookSignature: function () {
        return { valid: true }
      },
      processWebhook: async function () {
        return {
          paymentId: PAYMENT_ID,
          externalTransactionId: EXTERNAL_TX_ID,
          status: 'completed',
          rawPayload: { stub: true },
        }
      },
    }

    mockGatewayManager = {
      hasAdapter: function () {
        return true
      },
      getAdapter: function () {
        return mockAdapter
      },
    }

    mockPaymentGatewaysRepo = {
      getById: async function (id: string) {
        if (id === GATEWAY_ID) {
          return { id: GATEWAY_ID, configuration: GATEWAY_CONFIG }
        }
        return null
      },
      getByType: async function () {
        return [{ id: GATEWAY_ID, configuration: GATEWAY_CONFIG }]
      },
    }

    mockGatewayTxRepo = {
      getByExternalReference: async function () {
        return null
      },
      markVerified: async function (id: string, externalTxId: string) {
        markVerifiedCalls.push({ id, externalTxId })
      },
      markFailed: async function (id: string, error: string) {
        markFailedCalls.push({ id, error })
      },
      withTx: function () {
        return this
      },
    }

    mockPaymentsRepo = {
      getById: async function (id: string) {
        if (id === PAYMENT_ID) return { ...MOCK_PAYMENT }
        return null
      },
      verifyPayment: async function (id: string, verifiedBy: string, notes: string) {
        verifyPaymentCalls.push({ id, verifiedBy, notes })
        return { ...MOCK_PAYMENT, status: 'completed', verifiedBy } as TPayment
      },
      withTx: function () {
        return this
      },
    }

    mockNotificationService = {
      execute: async function (input: unknown) {
        notificationCalls.push(input)
        return { success: true }
      },
    }

    mockDb = {
      transaction: async function <T>(fn: (tx: unknown) => Promise<T>) {
        return await fn(mockDb)
      },
    }

    service = new ProcessWebhookService(
      mockDb as never,
      mockGatewayManager as never,
      mockPaymentGatewaysRepo as never,
      mockGatewayTxRepo as never,
      mockPaymentsRepo as never,
      mockNotificationService as never
    )
  })

  // ─── Happy Path ─────────────────────────────────────────────────────────

  describe('successful webhook processing', function () {
    it('should process a Stripe webhook and auto-verify payment', async function () {
      const result = await service.execute(createStripeWebhookInput())

      expect(result.success).toBe(true)
      if (!result.success) return

      expect(result.data.paymentId).toBe(PAYMENT_ID)
      expect(result.data.externalTransactionId).toBe(EXTERNAL_TX_ID)
      expect(result.data.status).toBe('completed')
      expect(result.data.autoVerified).toBe(true)
    })

    it('should call verifyPayment with SYSTEM_USER_ID', async function () {
      await service.execute(createStripeWebhookInput())

      expect(verifyPaymentCalls).toHaveLength(1)
      expect(verifyPaymentCalls[0]!.id).toBe(PAYMENT_ID)
      expect(verifyPaymentCalls[0]!.verifiedBy).toBe('00000000-0000-0000-0000-000000000000')
      expect(verifyPaymentCalls[0]!.notes).toContain('Auto-verified via stripe webhook')
    })

    it('should process a bank webhook', async function () {
      mockAdapter.processWebhook = async function () {
        return {
          paymentId: PAYMENT_ID,
          externalTransactionId: 'bank_tx_789',
          status: 'completed',
          rawPayload: { stub: true },
        }
      }

      const result = await service.execute(createBankWebhookInput())

      expect(result.success).toBe(true)
      if (!result.success) return

      expect(result.data.paymentId).toBe(PAYMENT_ID)
      expect(result.data.autoVerified).toBe(true)
    })

    it('should fire success notification after auto-verify', async function () {
      await service.execute(createStripeWebhookInput())

      // Notifications are fire-and-forget, give them a tick to resolve
      await new Promise(r => setTimeout(r, 10))

      expect(notificationCalls.length).toBeGreaterThanOrEqual(1)
      const call = notificationCalls[0] as Record<string, unknown>
      expect(call.userId).toBe(USER_ID)
      expect(call.title).toBe('Pago Verificado')
    })
  })

  // ─── Unknown Gateway ────────────────────────────────────────────────────

  describe('unknown gateway type', function () {
    it('should return BAD_REQUEST for unregistered gateway', async function () {
      mockGatewayManager.hasAdapter = function () {
        return false
      }

      const result = await service.execute(
        createStripeWebhookInput({ gatewayType: 'nonexistent' as TGatewayType })
      )

      expect(result.success).toBe(false)
      if (result.success) return

      expect(result.code).toBe('BAD_REQUEST')
      expect(result.error).toContain('Unknown gateway type')
    })
  })

  // ─── No Gateway Config ─────────────────────────────────────────────────

  describe('no gateway configuration', function () {
    it('should return NOT_FOUND when no gateway is configured', async function () {
      mockPaymentGatewaysRepo.getByType = async function () {
        return []
      }
      mockPaymentsRepo.getById = async function () {
        return null
      }

      const result = await service.execute(
        createStripeWebhookInput({
          body: { type: 'checkout.session.completed', data: { object: {} } },
        })
      )

      expect(result.success).toBe(false)
      if (result.success) return

      expect(result.code).toBe('NOT_FOUND')
      expect(result.error).toContain('No active gateway')
    })
  })

  // ─── Signature Validation ──────────────────────────────────────────────

  describe('signature validation', function () {
    it('should return FORBIDDEN when signature is invalid', async function () {
      mockAdapter.validateWebhookSignature = function () {
        return { valid: false, reason: 'HMAC mismatch' }
      }

      const result = await service.execute(createStripeWebhookInput())

      expect(result.success).toBe(false)
      if (result.success) return

      expect(result.code).toBe('FORBIDDEN')
      expect(result.error).toContain('HMAC mismatch')
    })

    it('should include default reason when none provided', async function () {
      mockAdapter.validateWebhookSignature = function () {
        return { valid: false }
      }

      const result = await service.execute(createStripeWebhookInput())

      expect(result.success).toBe(false)
      if (result.success) return

      expect(result.error).toContain('invalid signature')
    })
  })

  // ─── Idempotency ───────────────────────────────────────────────────────

  describe('idempotency', function () {
    it('should skip processing when transaction already completed', async function () {
      mockGatewayTxRepo.getByExternalReference = async function () {
        return { id: GATEWAY_TX_ID, status: 'completed' }
      }

      const result = await service.execute(createStripeWebhookInput())

      expect(result.success).toBe(true)
      if (!result.success) return

      expect(result.data.autoVerified).toBe(false)
      expect(verifyPaymentCalls).toHaveLength(0)
      expect(markVerifiedCalls).toHaveLength(0)
    })

    it('should process when transaction exists but is not completed', async function () {
      // First call to getByExternalReference (idempotency check) returns initiated
      // Second call inside transaction also returns initiated
      mockGatewayTxRepo.getByExternalReference = async function () {
        return { id: GATEWAY_TX_ID, status: 'initiated' }
      }

      const result = await service.execute(createStripeWebhookInput())

      expect(result.success).toBe(true)
      if (!result.success) return

      expect(result.data.autoVerified).toBe(true)
      expect(markVerifiedCalls).toHaveLength(1)
      expect(markVerifiedCalls[0]!.id).toBe(GATEWAY_TX_ID)
    })
  })

  // ─── Gateway Transaction Updates ───────────────────────────────────────

  describe('gateway transaction updates', function () {
    it('should mark gateway transaction as verified on completed webhook', async function () {
      mockGatewayTxRepo.getByExternalReference = async function () {
        return { id: GATEWAY_TX_ID, status: 'initiated' }
      }

      await service.execute(createStripeWebhookInput())

      expect(markVerifiedCalls).toHaveLength(1)
      expect(markVerifiedCalls[0]!.id).toBe(GATEWAY_TX_ID)
      expect(markVerifiedCalls[0]!.externalTxId).toBe(EXTERNAL_TX_ID)
    })

    it('should mark gateway transaction as failed on failed webhook', async function () {
      mockGatewayTxRepo.getByExternalReference = async function () {
        return { id: GATEWAY_TX_ID, status: 'initiated' }
      }

      mockAdapter.processWebhook = async function () {
        return {
          paymentId: PAYMENT_ID,
          externalTransactionId: EXTERNAL_TX_ID,
          status: 'failed',
          rawPayload: {},
        }
      }

      await service.execute(createStripeWebhookInput())

      expect(markFailedCalls).toHaveLength(1)
      expect(markFailedCalls[0]!.id).toBe(GATEWAY_TX_ID)
      expect(markFailedCalls[0]!.error).toBe('Webhook reported failure')
    })

    it('should not update gateway transaction when none exists', async function () {
      await service.execute(createStripeWebhookInput())

      expect(markVerifiedCalls).toHaveLength(0)
      expect(markFailedCalls).toHaveLength(0)
    })
  })

  // ─── Payment State Guards ──────────────────────────────────────────────

  describe('payment state guards', function () {
    it('should not auto-verify when payment is already completed', async function () {
      mockPaymentsRepo.getById = async function () {
        return { ...MOCK_PAYMENT, status: 'completed' } as TPayment
      }

      const result = await service.execute(createStripeWebhookInput())

      expect(result.success).toBe(true)
      if (!result.success) return

      expect(result.data.autoVerified).toBe(false)
      expect(verifyPaymentCalls).toHaveLength(0)
    })

    it('should not auto-verify when payment is rejected', async function () {
      mockPaymentsRepo.getById = async function () {
        return { ...MOCK_PAYMENT, status: 'rejected' } as TPayment
      }

      const result = await service.execute(createStripeWebhookInput())

      expect(result.success).toBe(true)
      if (!result.success) return

      expect(result.data.autoVerified).toBe(false)
      expect(verifyPaymentCalls).toHaveLength(0)
    })

    it('should not auto-verify when paymentId is null', async function () {
      mockAdapter.processWebhook = async function () {
        return {
          paymentId: null,
          externalTransactionId: EXTERNAL_TX_ID,
          status: 'completed',
          rawPayload: {},
        }
      }

      const result = await service.execute(createStripeWebhookInput())

      expect(result.success).toBe(true)
      if (!result.success) return

      expect(result.data.autoVerified).toBe(false)
      expect(verifyPaymentCalls).toHaveLength(0)
    })
  })

  // ─── Failed Webhook Notifications ──────────────────────────────────────

  describe('failure notifications', function () {
    it('should send failure notification when webhook reports failed', async function () {
      mockAdapter.processWebhook = async function () {
        return {
          paymentId: PAYMENT_ID,
          externalTransactionId: EXTERNAL_TX_ID,
          status: 'failed',
          rawPayload: {},
        }
      }

      await service.execute(createStripeWebhookInput())

      await new Promise(r => setTimeout(r, 10))

      expect(notificationCalls.length).toBeGreaterThanOrEqual(1)
      const call = notificationCalls[0] as Record<string, unknown>
      expect(call.title).toBe('Pago Fallido')
      expect(call.priority).toBe('high')
    })

    it('should not send notification when no paymentId', async function () {
      mockAdapter.processWebhook = async function () {
        return {
          paymentId: null,
          externalTransactionId: EXTERNAL_TX_ID,
          status: 'completed',
          rawPayload: {},
        }
      }

      await service.execute(createStripeWebhookInput())

      await new Promise(r => setTimeout(r, 10))

      expect(notificationCalls).toHaveLength(0)
    })
  })

  // ─── Multi-Tenant Gateway Resolution ───────────────────────────────────

  describe('multi-tenant gateway resolution', function () {
    it('should resolve config from payment gateway when paymentId is in body', async function () {
      const specificConfig = { secretKey: 'sk_specific', webhookSecret: 'whsec_specific' }
      let resolvedConfigKey: string | null = null

      mockAdapter.validateWebhookSignature = function (input: unknown) {
        const typed = input as { gatewayConfiguration: Record<string, unknown> }
        resolvedConfigKey = typed.gatewayConfiguration.secretKey as string
        return { valid: true }
      }

      mockPaymentsRepo.getById = async function (id: string) {
        if (id === PAYMENT_ID) {
          return { ...MOCK_PAYMENT, paymentGatewayId: 'specific-gateway-id' } as TPayment
        }
        return null
      }

      mockPaymentGatewaysRepo.getById = async function (id: string) {
        if (id === 'specific-gateway-id') {
          return { id: 'specific-gateway-id', configuration: specificConfig }
        }
        return null
      }

      await service.execute(createStripeWebhookInput())

      expect(resolvedConfigKey!).toBe('sk_specific')
    })

    it('should fallback to first gateway of type when paymentId not in body', async function () {
      let resolvedConfigKey: string | null = null

      mockAdapter.validateWebhookSignature = function (input: unknown) {
        const typed = input as { gatewayConfiguration: Record<string, unknown> }
        resolvedConfigKey = typed.gatewayConfiguration.secretKey as string
        return { valid: true }
      }

      const result = await service.execute(
        createStripeWebhookInput({
          body: { type: 'checkout.session.completed', data: { object: {} } },
        })
      )

      expect(result.success).toBe(true)
      expect(resolvedConfigKey!).toBe('sk_test_xxx')
    })

    it('should resolve bank webhook paymentId from top-level body', async function () {
      const bankConfig = { apiSecret: 'bank_secret_123' }
      let resolvedSecret: string | null = null

      mockAdapter.validateWebhookSignature = function (input: unknown) {
        const typed = input as { gatewayConfiguration: Record<string, unknown> }
        resolvedSecret = typed.gatewayConfiguration.apiSecret as string
        return { valid: true }
      }

      mockPaymentsRepo.getById = async function (id: string) {
        if (id === PAYMENT_ID) {
          return { ...MOCK_PAYMENT, paymentGatewayId: 'bank-gw-id' } as TPayment
        }
        return null
      }

      mockPaymentGatewaysRepo.getById = async function (id: string) {
        if (id === 'bank-gw-id') {
          return { id: 'bank-gw-id', configuration: bankConfig }
        }
        return null
      }

      mockAdapter.processWebhook = async function () {
        return {
          paymentId: PAYMENT_ID,
          externalTransactionId: 'bank_tx_789',
          status: 'completed',
          rawPayload: {},
        }
      }

      await service.execute(createBankWebhookInput())

      expect(resolvedSecret!).toBe('bank_secret_123')
    })
  })

  // ─── No Notification Service ───────────────────────────────────────────

  describe('without notification service', function () {
    it('should process webhook without errors when no notification service', async function () {
      service = new ProcessWebhookService(
        mockDb as never,
        mockGatewayManager as never,
        mockPaymentGatewaysRepo as never,
        mockGatewayTxRepo as never,
        mockPaymentsRepo as never,
        undefined
      )

      const result = await service.execute(createStripeWebhookInput())

      expect(result.success).toBe(true)
      if (!result.success) return

      expect(result.data.autoVerified).toBe(true)
    })
  })
})
