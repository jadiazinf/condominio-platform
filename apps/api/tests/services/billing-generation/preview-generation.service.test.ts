import { describe, it, expect, beforeEach } from 'bun:test'
import { PreviewGenerationService } from '@src/services/billing-generation/preview-generation.service'

const units = [
  { id: 'u1', unitNumber: 'A-1', aliquotPercentage: '50.00', buildingId: 'b1', isActive: true },
  { id: 'u2', unitNumber: 'B-1', aliquotPercentage: '50.00', buildingId: 'b1', isActive: true },
]

describe('PreviewGenerationService', () => {
  let service: PreviewGenerationService

  beforeEach(() => {
    service = new PreviewGenerationService(
      { getById: async () => ({ id: 'ch-1', condominiumId: 'c1', buildingId: null, distributionMethod: 'by_aliquot', isActive: true, channelType: 'receipt' }) } as never,
      { findByCondominium: async () => units } as never,
      { listByChannel: async () => [
        { id: 'ct-1', name: 'Administración', category: 'ordinary' },
        { id: 'ct-2', name: 'Fondo Reserva', category: 'reserve_fund' },
      ] } as never,
    )
  })

  it('should return distribution preview per unit', async () => {
    const result = await service.execute({
      channelId: 'ch-1',
      chargeAmounts: [
        { chargeTypeId: 'ct-1', amount: '10000.00' },
        { chargeTypeId: 'ct-2', amount: '1000.00' },
      ],
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.unitPreviews.length).toBe(2)
      // 50% of 10000 = 5000, 50% of 1000 = 500
      const u1 = result.data.unitPreviews[0]!
      expect(u1.charges.length).toBe(2)
      expect(parseFloat(u1.total)).toBeCloseTo(5500, 0)

      expect(result.data.grandTotal).toBeDefined()
      expect(parseFloat(result.data.grandTotal)).toBeCloseTo(11000, 0)
    }
  })

  it('should calculate aliquot sum', async () => {
    const result = await service.execute({
      channelId: 'ch-1',
      chargeAmounts: [{ chargeTypeId: 'ct-1', amount: '10000.00' }],
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(parseFloat(result.data.aliquotSum)).toBeCloseTo(100, 1)
    }
  })
})
