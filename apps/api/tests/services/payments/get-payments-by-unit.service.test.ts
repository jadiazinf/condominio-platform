import { describe, it, expect, beforeEach } from 'bun:test'
import type { TPayment } from '@packages/domain'
import { GetPaymentsByUnitService } from '@src/services/payments'

type TMockRepository = {
  getByUnitId: (unitId: string) => Promise<TPayment[]>
}

describe('GetPaymentsByUnitService', function () {
  let service: GetPaymentsByUnitService
  let mockRepository: TMockRepository

  const unitId = '550e8400-e29b-41d4-a716-446655440020'

  const mockPayments: TPayment[] = [
    {
      id: '550e8400-e29b-41d4-a716-446655440001',
      paymentNumber: 'PAY-001',
      userId: '550e8400-e29b-41d4-a716-446655440010',
      unitId,
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
  ]

  beforeEach(function () {
    mockRepository = {
      getByUnitId: async function (requestedUnitId: string) {
        return mockPayments.filter(function (p) {
          return p.unitId === requestedUnitId
        })
      },
    }
    service = new GetPaymentsByUnitService(mockRepository as never)
  })

  describe('execute', function () {
    it('should return all payments for a unit', async function () {
      const result = await service.execute({ unitId })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(1)
        expect(result.data.every(p => p.unitId === unitId)).toBe(true)
      }
    })

    it('should return empty array when unit has no payments', async function () {
      const result = await service.execute({ unitId: '550e8400-e29b-41d4-a716-446655440099' })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(0)
      }
    })
  })
})
