import { describe, it, expect, mock, beforeEach } from 'bun:test'
import { BncPaymentAdapter } from './bnc.adapter'
import type { IBncConfig } from '@libs/bnc/types'

describe('BncPaymentAdapter', () => {
  const bncConfig: IBncConfig = {
    baseUrl: 'https://bnc-test.example.com',
    clientGUID: '12345678-1234-1234-1234-123456789012',
    masterKey: 'test-master-key',
    terminal: 'TERM0001',
    sandbox: true,
  }

  describe('constructor', () => {
    it('should create adapter without config (unconfigured)', () => {
      const adapter = new BncPaymentAdapter()

      expect(adapter.gatewayType).toBe('bnc')
    })

    it('should create adapter with config', () => {
      const adapter = new BncPaymentAdapter(bncConfig, 'webhook-key')

      expect(adapter.gatewayType).toBe('bnc')
    })
  })

  describe('validateConfiguration', () => {
    it('should return invalid when BNC is not configured', () => {
      const adapter = new BncPaymentAdapter()
      const result = adapter.validateConfiguration({})

      expect(result.valid).toBe(false)
      expect(result.missingFields.length).toBeGreaterThan(0)
    })

    it('should return valid when BNC is configured', () => {
      const adapter = new BncPaymentAdapter(bncConfig)
      const result = adapter.validateConfiguration({})

      expect(result.valid).toBe(true)
      expect(result.missingFields).toEqual([])
    })
  })

  describe('validateWebhookSignature', () => {
    it('should reject when webhook API key is not configured', () => {
      const adapter = new BncPaymentAdapter(bncConfig)
      const result = adapter.validateWebhookSignature({
        headers: { 'x-api-key': 'some-key' },
        rawBody: '{}',
        gatewayConfiguration: {},
      })

      expect(result.valid).toBe(false)
      expect(result.reason).toContain('not configured')
    })

    it('should reject when x-api-key header is missing', () => {
      const adapter = new BncPaymentAdapter(bncConfig, 'my-webhook-key')
      const result = adapter.validateWebhookSignature({
        headers: {},
        rawBody: '{}',
        gatewayConfiguration: {},
      })

      expect(result.valid).toBe(false)
      expect(result.reason).toContain('Invalid')
    })

    it('should reject when x-api-key does not match', () => {
      const adapter = new BncPaymentAdapter(bncConfig, 'my-webhook-key')
      const result = adapter.validateWebhookSignature({
        headers: { 'x-api-key': 'wrong-key' },
        rawBody: '{}',
        gatewayConfiguration: {},
      })

      expect(result.valid).toBe(false)
    })

    it('should accept when x-api-key matches', () => {
      const adapter = new BncPaymentAdapter(bncConfig, 'my-webhook-key')
      const result = adapter.validateWebhookSignature({
        headers: { 'x-api-key': 'my-webhook-key' },
        rawBody: '{}',
        gatewayConfiguration: {},
      })

      expect(result.valid).toBe(true)
    })
  })

  describe('processWebhook', () => {
    it('should process P2P webhook payload', async () => {
      const adapter = new BncPaymentAdapter(bncConfig, 'key')

      const result = await adapter.processWebhook({
        headers: {},
        body: {
          PaymentType: 'P2P',
          OriginBankReference: 'REF123',
          DestinyBankReference: 'DREF456',
          OriginBankCode: '0102',
          Hour: '1430',
          CurrencyCode: 'VES',
          Amount: '000000001500000',
          Date: '20260320',
          CommerceID: 'J12345678',
          ClientPhone: '584121234567',
          Concept: 'Pago condominio',
        },
        gatewayConfiguration: {},
      })

      expect(result.externalTransactionId).toBe('DREF456')
      expect(result.status).toBe('completed')
      expect(result.paymentId).toBeNull() // No PAY: prefix in concept
    })

    it('should extract paymentId from concept when encoded', async () => {
      const adapter = new BncPaymentAdapter(bncConfig, 'key')

      const result = await adapter.processWebhook({
        headers: {},
        body: {
          PaymentType: 'P2P',
          OriginBankReference: 'REF123',
          DestinyBankReference: 'DREF456',
          OriginBankCode: '0102',
          Hour: '1430',
          CurrencyCode: 'VES',
          Amount: '000000001500000',
          Date: '20260320',
          CommerceID: 'J12345678',
          Concept: 'PAY:abc-123-def Condominio',
        },
        gatewayConfiguration: {},
      })

      expect(result.paymentId).toBe('abc-123-def')
    })

    it('should process TRF webhook payload', async () => {
      const adapter = new BncPaymentAdapter(bncConfig, 'key')

      const result = await adapter.processWebhook({
        headers: {},
        body: {
          PaymentType: 'TRF',
          OriginBankReference: 'TREF789',
          DestinyBankReference: '',
          OriginBankCode: '0134',
          Hour: '0900',
          CurrencyCode: 'VES',
          Amount: '000000005000000',
          Date: '20260320',
          CommerceID: 'J12345678',
          DebtorAccount: '01340000000000001234',
          DebtorID: 'V12345678',
          CreditorAccount: '01910000000000005678',
        },
        gatewayConfiguration: {},
      })

      expect(result.externalTransactionId).toBe('TREF789')
      expect(result.status).toBe('completed')
    })
  })

  describe('initiatePayment', () => {
    it('should throw when BNC is not configured', async () => {
      const adapter = new BncPaymentAdapter()

      await expect(
        adapter.initiatePayment(
          { paymentId: 'p1', amount: '100', currencyCode: 'VES' },
          {},
        ),
      ).rejects.toThrow('BNC no configurado')
    })

    it('should throw for unsupported payment method', async () => {
      const adapter = new BncPaymentAdapter(bncConfig)

      await expect(
        adapter.initiatePayment(
          {
            paymentId: 'p1',
            amount: '100',
            currencyCode: 'VES',
            metadata: { method: 'bitcoin' },
          },
          {},
        ),
      ).rejects.toThrow('Unsupported BNC payment method')
    })
  })

  describe('verifyPayment', () => {
    it('should throw when BNC is not configured', async () => {
      const adapter = new BncPaymentAdapter()

      await expect(
        adapter.verifyPayment({
          paymentId: 'p1',
          externalReference: 'REF123',
          gatewayConfiguration: {},
        }),
      ).rejects.toThrow('BNC no configurado')
    })
  })

  describe('refund', () => {
    it('should reject VPOS refunds', async () => {
      const adapter = new BncPaymentAdapter(bncConfig)
      const result = await adapter.refund({
        externalTransactionId: '12345',
        amount: '100',
        gatewayConfiguration: { method: 'vpos' },
      })

      expect(result.status).toBe('failed')
      expect(result.errorMessage).toContain('VPOS')
    })
  })

  describe('healthCheck', () => {
    it('should return false when not configured', async () => {
      const adapter = new BncPaymentAdapter()
      const result = await adapter.healthCheck()

      expect(result).toBe(false)
    })
  })
})
