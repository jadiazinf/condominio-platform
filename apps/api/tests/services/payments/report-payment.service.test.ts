import { describe, it, expect, beforeEach } from 'bun:test'
import type { TPayment, TPaymentCreate } from '@packages/domain'
import { ReportPaymentService } from '@src/services/payments'

type TMockRepository = {
  create: (data: TPaymentCreate) => Promise<TPayment>
}

describe('ReportPaymentService', function () {
  let service: ReportPaymentService
  let mockRepository: TMockRepository
  let capturedData: TPaymentCreate | null

  const userId = '550e8400-e29b-41d4-a716-446655440010'

  beforeEach(function () {
    capturedData = null
    mockRepository = {
      create: async function (data: TPaymentCreate) {
        capturedData = data
        return {
          id: '550e8400-e29b-41d4-a716-446655440001',
          paymentNumber: data.paymentNumber ?? 'PAY-AUTO',
          userId: data.userId,
          unitId: data.unitId,
          amount: data.amount,
          currencyId: data.currencyId,
          paidAmount: data.paidAmount ?? null,
          paidCurrencyId: data.paidCurrencyId ?? null,
          exchangeRate: data.exchangeRate ?? null,
          paymentMethod: data.paymentMethod,
          paymentGatewayId: data.paymentGatewayId ?? null,
          paymentDetails: data.paymentDetails ?? null,
          paymentDate: data.paymentDate,
          registeredAt: new Date(),
          status: data.status ?? 'pending',
          receiptUrl: data.receiptUrl ?? null,
          receiptNumber: data.receiptNumber ?? null,
          notes: data.notes ?? null,
          metadata: data.metadata ?? null,
          registeredBy: data.registeredBy ?? null,
          verifiedBy: null,
          verifiedAt: null,
          verificationNotes: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      },
    }
    service = new ReportPaymentService(mockRepository as never)
  })

  describe('execute', function () {
    it('should create payment with pending_verification status', async function () {
      const paymentData: TPaymentCreate = {
        paymentNumber: 'PAY-REPORT-001',
        userId: '550e8400-e29b-41d4-a716-446655440010',
        unitId: '550e8400-e29b-41d4-a716-446655440020',
        amount: '150.00',
        currencyId: '550e8400-e29b-41d4-a716-446655440050',
        paidAmount: null,
        paidCurrencyId: null,
        exchangeRate: null,
        paymentMethod: 'cash',
        paymentGatewayId: null,
        paymentDetails: null,
        paymentDate: '2024-01-15',
        status: 'pending',
        receiptUrl: null,
        receiptNumber: null,
        notes: 'External payment',
        metadata: null,
        registeredBy: null,
      }

      const result = await service.execute({
        paymentData,
        registeredByUserId: userId,
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.status).toBe('pending_verification')
        expect(result.data.id).toBeDefined()
      }
    })

    it('should set registeredBy to the user who reported', async function () {
      const paymentData: TPaymentCreate = {
        paymentNumber: 'PAY-REPORT-002',
        userId: '550e8400-e29b-41d4-a716-446655440011',
        unitId: '550e8400-e29b-41d4-a716-446655440020',
        amount: '200.00',
        currencyId: '550e8400-e29b-41d4-a716-446655440050',
        paidAmount: null,
        paidCurrencyId: null,
        exchangeRate: null,
        paymentMethod: 'transfer',
        paymentGatewayId: null,
        paymentDetails: null,
        paymentDate: '2024-01-20',
        status: 'completed',
        receiptUrl: null,
        receiptNumber: null,
        notes: null,
        metadata: null,
        registeredBy: null,
      }

      await service.execute({
        paymentData,
        registeredByUserId: userId,
      })

      expect(capturedData).not.toBeNull()
      expect(capturedData!.registeredBy).toBe(userId)
    })

    it('should override any status in payment data with pending_verification', async function () {
      const paymentData: TPaymentCreate = {
        paymentNumber: 'PAY-REPORT-003',
        userId: '550e8400-e29b-41d4-a716-446655440010',
        unitId: '550e8400-e29b-41d4-a716-446655440020',
        amount: '100.00',
        currencyId: '550e8400-e29b-41d4-a716-446655440050',
        paidAmount: null,
        paidCurrencyId: null,
        exchangeRate: null,
        paymentMethod: 'cash',
        paymentGatewayId: null,
        paymentDetails: null,
        paymentDate: '2024-01-25',
        status: 'completed',
        receiptUrl: null,
        receiptNumber: null,
        notes: null,
        metadata: null,
        registeredBy: null,
      }

      await service.execute({
        paymentData,
        registeredByUserId: userId,
      })

      expect(capturedData).not.toBeNull()
      expect(capturedData!.status).toBe('pending_verification')
    })
  })
})
