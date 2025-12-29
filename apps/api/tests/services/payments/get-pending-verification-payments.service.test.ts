import { describe, it, expect, beforeEach } from 'bun:test'
import type { TPayment } from '@packages/domain'
import { GetPendingVerificationPaymentsService } from '@src/services/payments'

type TMockRepository = {
  getPendingVerification: () => Promise<TPayment[]>
}

describe('GetPendingVerificationPaymentsService', function () {
  let service: GetPendingVerificationPaymentsService
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
      registeredBy: '550e8400-e29b-41d4-a716-446655440010',
      verifiedBy: null,
      verifiedAt: null,
      verificationNotes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440002',
      paymentNumber: 'PAY-002',
      userId: '550e8400-e29b-41d4-a716-446655440011',
      unitId: '550e8400-e29b-41d4-a716-446655440021',
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
      status: 'pending_verification',
      receiptUrl: null,
      receiptNumber: null,
      notes: null,
      metadata: null,
      registeredBy: '550e8400-e29b-41d4-a716-446655440011',
      verifiedBy: null,
      verifiedAt: null,
      verificationNotes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]

  beforeEach(function () {
    mockRepository = {
      getPendingVerification: async function () {
        return mockPayments
      },
    }
    service = new GetPendingVerificationPaymentsService(mockRepository as never)
  })

  describe('execute', function () {
    it('should return all payments pending verification', async function () {
      const result = await service.execute()

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(2)
        expect(result.data.every((p) => p.status === 'pending_verification')).toBe(true)
      }
    })

    it('should return empty array when no payments pending', async function () {
      mockRepository.getPendingVerification = async function () {
        return []
      }

      const result = await service.execute()

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(0)
      }
    })
  })
})
