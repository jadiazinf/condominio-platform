import { describe, it, expect, beforeEach } from 'bun:test'
import type { TPayment } from '@packages/domain'
import { GetPaymentsByStatusService } from '@src/services/payments'

type TMockRepository = {
  getByStatus: (status: TPayment['status']) => Promise<TPayment[]>
}

describe('GetPaymentsByStatusService', function () {
  let service: GetPaymentsByStatusService
  let mockRepository: TMockRepository

  const mockPayments: TPayment[] = [
    {
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
      status: 'pending_verification',
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
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440002',
      paymentNumber: 'PAY-002',
      userId: '550e8400-e29b-41d4-a716-446655440010',
      unitId: '550e8400-e29b-41d4-a716-446655440020',
      amount: '200.00',
      currencyId: '550e8400-e29b-41d4-a716-446655440050',
      paidAmount: null,
      paidCurrencyId: null,
      exchangeRate: null,
      paymentMethod: 'cash',
      paymentGatewayId: null,
      paymentDetails: null,
      paymentDate: '2024-01-20',
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
    },
  ]

  beforeEach(function () {
    mockRepository = {
      getByStatus: async function (status: TPayment['status']) {
        return mockPayments.filter(function (p) {
          return p.status === status
        })
      },
    }
    service = new GetPaymentsByStatusService(mockRepository as never)
  })

  describe('execute', function () {
    it('should return payments with pending_verification status', async function () {
      const result = await service.execute({ status: 'pending_verification' })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(1)
        expect(result.data.every((p) => p.status === 'pending_verification')).toBe(true)
      }
    })

    it('should return payments with completed status', async function () {
      const result = await service.execute({ status: 'completed' })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(1)
        expect(result.data.every((p) => p.status === 'completed')).toBe(true)
      }
    })

    it('should return empty array when no payments match status', async function () {
      const result = await service.execute({ status: 'rejected' })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(0)
      }
    })
  })
})
