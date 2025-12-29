import { describe, it, expect, beforeEach } from 'bun:test'
import type { TPayment } from '@packages/domain'
import { GetPaymentsByDateRangeService } from '@src/services/payments'

type TMockRepository = {
  getByDateRange: (startDate: string, endDate: string) => Promise<TPayment[]>
}

describe('GetPaymentsByDateRangeService', function () {
  let service: GetPaymentsByDateRangeService
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
      paymentDate: '2024-02-20',
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
      getByDateRange: async function (startDate: string, endDate: string) {
        return mockPayments.filter(function (p) {
          return p.paymentDate >= startDate && p.paymentDate <= endDate
        })
      },
    }
    service = new GetPaymentsByDateRangeService(mockRepository as never)
  })

  describe('execute', function () {
    it('should return payments within date range', async function () {
      const result = await service.execute({
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(1)
        const payment = result.data[0]
        expect(payment).toBeDefined()
        expect(payment!.paymentDate).toBe('2024-01-15')
      }
    })

    it('should return all payments when range covers all dates', async function () {
      const result = await service.execute({
        startDate: '2024-01-01',
        endDate: '2024-12-31',
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(2)
      }
    })

    it('should return empty array when no payments in range', async function () {
      const result = await service.execute({
        startDate: '2023-01-01',
        endDate: '2023-12-31',
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(0)
      }
    })
  })
})
