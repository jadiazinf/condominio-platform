import { describe, it, expect, beforeEach } from 'bun:test'
import type { TPayment } from '@packages/domain'
import { GetPaymentsByUserService } from '@src/services/payments'

type TMockRepository = {
  getByUserId: (userId: string) => Promise<TPayment[]>
}

describe('GetPaymentsByUserService', function () {
  let service: GetPaymentsByUserService
  let mockRepository: TMockRepository

  const userId = '550e8400-e29b-41d4-a716-446655440010'

  const mockPayments: TPayment[] = [
    {
      id: '550e8400-e29b-41d4-a716-446655440001',
      paymentNumber: 'PAY-001',
      userId,
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
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440002',
      paymentNumber: 'PAY-002',
      userId,
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
      status: 'pending',
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
      getByUserId: async function (requestedUserId: string) {
        return mockPayments.filter(function (p) {
          return p.userId === requestedUserId
        })
      },
    }
    service = new GetPaymentsByUserService(mockRepository as never)
  })

  describe('execute', function () {
    it('should return all payments for a user', async function () {
      const result = await service.execute({ userId })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(2)
        expect(result.data.every(p => p.userId === userId)).toBe(true)
      }
    })

    it('should return empty array when user has no payments', async function () {
      const result = await service.execute({ userId: '550e8400-e29b-41d4-a716-446655440099' })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(0)
      }
    })
  })
})
