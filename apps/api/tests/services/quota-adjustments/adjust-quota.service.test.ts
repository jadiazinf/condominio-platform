import { describe, it, expect, beforeEach } from 'bun:test'
import type { TQuota, TQuotaAdjustment } from '@packages/domain'
import { AdjustQuotaService } from '@src/services/quota-adjustments'

type TMockQuotasRepository = {
  getById: (id: string) => Promise<TQuota | null>
  update: (id: string, data: Partial<TQuota>) => Promise<TQuota | null>
}

type TMockQuotaAdjustmentsRepository = {
  create: (data: {
    quotaId: string
    previousAmount: string
    newAmount: string
    adjustmentType: 'discount' | 'increase' | 'correction' | 'waiver'
    reason: string
    createdBy: string
  }) => Promise<TQuotaAdjustment>
}

describe('AdjustQuotaService', function () {
  let service: AdjustQuotaService
  let mockQuotasRepository: TMockQuotasRepository
  let mockQuotaAdjustmentsRepository: TMockQuotaAdjustmentsRepository

  const adminUserId = '550e8400-e29b-41d4-a716-446655440099'

  const pendingQuota: TQuota = {
    id: '550e8400-e29b-41d4-a716-446655440001',
    unitId: '550e8400-e29b-41d4-a716-446655440010',
    paymentConceptId: '550e8400-e29b-41d4-a716-446655440020',
    periodYear: 2025,
    periodMonth: 1,
    periodDescription: 'Enero 2025',
    baseAmount: '50.00',
    currencyId: '550e8400-e29b-41d4-a716-446655440030',
    interestAmount: '0',
    amountInBaseCurrency: null,
    exchangeRateUsed: null,
    issueDate: '2025-01-01',
    dueDate: '2025-01-10',
    status: 'pending',
    paidAmount: '0',
    balance: '50.00',
    notes: null,
    metadata: null,
    createdBy: adminUserId,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  const partiallyPaidQuota: TQuota = {
    ...pendingQuota,
    id: '550e8400-e29b-41d4-a716-446655440002',
    paidAmount: '30.00',
    balance: '20.00',
  }

  const cancelledQuota: TQuota = {
    ...pendingQuota,
    id: '550e8400-e29b-41d4-a716-446655440003',
    status: 'cancelled',
  }

  const overdueQuota: TQuota = {
    ...pendingQuota,
    id: '550e8400-e29b-41d4-a716-446655440004',
    status: 'overdue',
    interestAmount: '5.00',
    balance: '55.00',
  }

  let lastCreatedAdjustment: TQuotaAdjustment | null = null
  let lastUpdatedQuota: { id: string; data: Partial<TQuota> } | null = null

  beforeEach(function () {
    lastCreatedAdjustment = null
    lastUpdatedQuota = null

    mockQuotasRepository = {
      getById: async function (id: string) {
        if (id === pendingQuota.id) return pendingQuota
        if (id === partiallyPaidQuota.id) return partiallyPaidQuota
        if (id === cancelledQuota.id) return cancelledQuota
        if (id === overdueQuota.id) return overdueQuota
        return null
      },
      update: async function (id: string, data: Partial<TQuota>) {
        lastUpdatedQuota = { id, data }
        const quota = await this.getById(id)
        if (!quota) return null
        return { ...quota, ...data }
      },
    }

    mockQuotaAdjustmentsRepository = {
      create: async function (data) {
        const adjustment: TQuotaAdjustment = {
          id: '550e8400-e29b-41d4-a716-446655440100',
          quotaId: data.quotaId,
          previousAmount: data.previousAmount,
          newAmount: data.newAmount,
          adjustmentType: data.adjustmentType,
          reason: data.reason,
          createdBy: data.createdBy,
          createdAt: new Date(),
        }
        lastCreatedAdjustment = adjustment
        return adjustment
      },
    }

    service = new AdjustQuotaService(
      mockQuotasRepository as never,
      mockQuotaAdjustmentsRepository as never
    )
  })

  describe('execute', function () {
    it('should apply discount adjustment successfully', async function () {
      const result = await service.execute({
        quotaId: pendingQuota.id,
        newAmount: '40.00',
        adjustmentType: 'discount',
        reason: 'Rebaja acordada con propietario',
        adjustedByUserId: adminUserId,
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.adjustment.previousAmount).toBe('50.00')
        expect(result.data.adjustment.newAmount).toBe('40.00')
        expect(result.data.adjustment.adjustmentType).toBe('discount')
        expect(result.data.adjustment.reason).toBe('Rebaja acordada con propietario')
        expect(result.data.message).toContain('50.00 to 40.00')
        expect(result.data.message).toContain('-10.00')
      }

      expect(lastUpdatedQuota).not.toBeNull()
      expect(lastUpdatedQuota?.data.baseAmount).toBe('40.00')
      expect(lastUpdatedQuota?.data.balance).toBe('40.00')
    })

    it('should apply increase adjustment successfully', async function () {
      const result = await service.execute({
        quotaId: pendingQuota.id,
        newAmount: '60.00',
        adjustmentType: 'increase',
        reason: 'Corrección por aumento de alícuota',
        adjustedByUserId: adminUserId,
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.adjustment.adjustmentType).toBe('increase')
        expect(result.data.message).toContain('+10.00')
      }

      expect(lastUpdatedQuota?.data.baseAmount).toBe('60.00')
      expect(lastUpdatedQuota?.data.balance).toBe('60.00')
    })

    it('should apply correction adjustment successfully', async function () {
      const result = await service.execute({
        quotaId: pendingQuota.id,
        newAmount: '55.00',
        adjustmentType: 'correction',
        reason: 'Corrección de error de digitación',
        adjustedByUserId: adminUserId,
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.adjustment.adjustmentType).toBe('correction')
      }
    })

    it('should apply waiver adjustment and set amount to 0', async function () {
      const result = await service.execute({
        quotaId: pendingQuota.id,
        newAmount: '0',
        adjustmentType: 'waiver',
        reason: 'Condonación total por situación especial',
        adjustedByUserId: adminUserId,
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.adjustment.adjustmentType).toBe('waiver')
        expect(result.data.adjustment.newAmount).toBe('0')
      }

      expect(lastUpdatedQuota?.data.baseAmount).toBe('0')
      expect(lastUpdatedQuota?.data.status).toBe('cancelled')
    })

    it('should mark quota as paid when new balance is zero or negative', async function () {
      const result = await service.execute({
        quotaId: partiallyPaidQuota.id,
        newAmount: '25.00',
        adjustmentType: 'discount',
        reason: 'Rebaja que completa el pago',
        adjustedByUserId: adminUserId,
      })

      expect(result.success).toBe(true)
      // New balance = 25 + 0 - 30 = -5, so status should be 'paid'
      expect(lastUpdatedQuota?.data.status).toBe('paid')
    })

    it('should calculate balance correctly with interest', async function () {
      const result = await service.execute({
        quotaId: overdueQuota.id,
        newAmount: '45.00',
        adjustmentType: 'discount',
        reason: 'Rebaja de monto base',
        adjustedByUserId: adminUserId,
      })

      expect(result.success).toBe(true)
      // New balance = 45 (new base) + 5 (interest) - 0 (paid) = 50
      expect(lastUpdatedQuota?.data.balance).toBe('50.00')
    })

    it('should return NOT_FOUND error when quota does not exist', async function () {
      const result = await service.execute({
        quotaId: '550e8400-e29b-41d4-a716-446655440999',
        newAmount: '40.00',
        adjustmentType: 'discount',
        reason: 'Rebaja acordada',
        adjustedByUserId: adminUserId,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe('NOT_FOUND')
        expect(result.error).toBe('Quota not found')
      }
    })

    it('should return BAD_REQUEST error when trying to adjust cancelled quota', async function () {
      const result = await service.execute({
        quotaId: cancelledQuota.id,
        newAmount: '40.00',
        adjustmentType: 'discount',
        reason: 'Rebaja acordada',
        adjustedByUserId: adminUserId,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe('BAD_REQUEST')
        expect(result.error).toBe('Cannot adjust a cancelled quota')
      }
    })

    it('should return BAD_REQUEST error when new amount equals current amount', async function () {
      const result = await service.execute({
        quotaId: pendingQuota.id,
        newAmount: '50.00',
        adjustmentType: 'correction',
        reason: 'Intento de ajuste sin cambio',
        adjustedByUserId: adminUserId,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe('BAD_REQUEST')
        expect(result.error).toBe('New amount must be different from current amount')
      }
    })

    it('should return BAD_REQUEST error when non-waiver adjustment has negative amount', async function () {
      const result = await service.execute({
        quotaId: pendingQuota.id,
        newAmount: '-10.00',
        adjustmentType: 'discount',
        reason: 'Monto negativo inválido',
        adjustedByUserId: adminUserId,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe('BAD_REQUEST')
        expect(result.error).toBe('New amount cannot be negative')
      }
    })

    it('should return BAD_REQUEST error when waiver adjustment has non-zero amount', async function () {
      const result = await service.execute({
        quotaId: pendingQuota.id,
        newAmount: '10.00',
        adjustmentType: 'waiver',
        reason: 'Condonación con monto inválido',
        adjustedByUserId: adminUserId,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe('BAD_REQUEST')
        expect(result.error).toBe('Waiver adjustment must set amount to 0')
      }
    })

    it('should create adjustment record with correct createdBy', async function () {
      await service.execute({
        quotaId: pendingQuota.id,
        newAmount: '40.00',
        adjustmentType: 'discount',
        reason: 'Rebaja acordada con propietario',
        adjustedByUserId: adminUserId,
      })

      expect(lastCreatedAdjustment).not.toBeNull()
      expect(lastCreatedAdjustment?.createdBy).toBe(adminUserId)
    })
  })
})
