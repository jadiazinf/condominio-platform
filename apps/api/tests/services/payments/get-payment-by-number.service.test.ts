import { describe, it, expect, beforeEach } from 'bun:test'
import type { TPayment } from '@packages/domain'
import { GetPaymentByNumberService } from '@src/services/payments'

type TMockRepository = {
  getByPaymentNumber: (paymentNumber: string) => Promise<TPayment | null>
}

describe('GetPaymentByNumberService', function () {
  let service: GetPaymentByNumberService
  let mockRepository: TMockRepository

  const mockPayment: TPayment = {
    id: '550e8400-e29b-41d4-a716-446655440001',
    paymentNumber: 'PAY-001',
    userId: '550e8400-e29b-41d4-a716-446655440010',
    unitId: '550e8400-e29b-41d4-a716-446655440020',
    amount: '150.00',
    currencyId: '550e8400-e29b-41d4-a716-446655440050',
    paidAmount: null,
    paidCurrencyId: null,
    exchangeRate: null,
    paymentMethod: 'transfer',
    paymentGatewayId: null,
    paymentDetails: null,
    paymentDate: '2024-01-15',
    registeredAt: new Date(),
    status: 'completed',
    receiptUrl: null,
    receiptNumber: null,
    notes: null,
    metadata: null,
    registeredBy: null,
    verifiedBy: null,
    verifiedAt: null,
    verificationNotes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  beforeEach(function () {
    mockRepository = {
      getByPaymentNumber: async function (paymentNumber: string) {
        if (paymentNumber === 'PAY-001') {
          return mockPayment
        }
        return null
      },
    }
    service = new GetPaymentByNumberService(mockRepository as never)
  })

  describe('execute', function () {
    it('should return payment when found', async function () {
      const result = await service.execute({ paymentNumber: 'PAY-001' })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.paymentNumber).toBe('PAY-001')
        expect(result.data.id).toBe(mockPayment.id)
      }
    })

    it('should return NOT_FOUND error when payment does not exist', async function () {
      const result = await service.execute({ paymentNumber: 'PAY-999' })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe('NOT_FOUND')
        expect(result.error).toBe('Payment not found')
      }
    })
  })
})
