import { describe, it, expect, beforeEach } from 'bun:test'
import { GenerateStandaloneChargeService } from '@src/services/billing-generation/generate-standalone-charge.service'

const units = [
  { id: 'u1', unitNumber: 'A-1', aliquotPercentage: '50.00', buildingId: 'b1', isActive: true },
  { id: 'u2', unitNumber: 'B-1', aliquotPercentage: '50.00', buildingId: 'b1', isActive: true },
]

let createdCharges: any[]
let createdEntries: any[]

describe('GenerateStandaloneChargeService', () => {
  let service: GenerateStandaloneChargeService

  beforeEach(() => {
    createdCharges = []
    createdEntries = []

    service = new GenerateStandaloneChargeService(
      { getById: async () => ({
        id: 'ch-1', condominiumId: 'c1', buildingId: null,
        distributionMethod: 'by_aliquot', isActive: true, channelType: 'standalone',
        currencyId: 'cur-1',
      }) } as never,
      { findByCondominium: async () => units } as never,
      {
        execute: async (input: any) => {
          const charge = { id: `c-${createdCharges.length + 1}`, ...input }
          createdCharges.push(charge)
          const entry = { id: `e-${createdEntries.length + 1}` }
          createdEntries.push(entry)
          return { success: true, data: { charge, entry } }
        },
      } as never,
    )
  })

  it('should create charges for all units (no receipt)', async () => {
    const result = await service.execute({
      channelId: 'ch-1',
      chargeTypeId: 'ct-maint',
      periodYear: 2026,
      periodMonth: 3,
      amount: '10000.00',
      description: 'Mantenimiento Marzo',
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.chargesCreated).toBe(2)
      expect(createdCharges.length).toBe(2)
      // Distributed by aliquot: 50% of 10000 = 5000 each
      expect(parseFloat(createdCharges[0].amount)).toBeCloseTo(5000, 0)
    }
  })

  it('should fail for receipt-type channel', async () => {
    const svc = new GenerateStandaloneChargeService(
      { getById: async () => ({ id: 'ch-1', channelType: 'receipt', isActive: true }) } as never,
      {} as never,
      {} as never,
    )

    const result = await svc.execute({
      channelId: 'ch-1', chargeTypeId: 'ct-1',
      periodYear: 2026, periodMonth: 3, amount: '1000.00',
    })

    expect(result.success).toBe(false)
    if (!result.success) expect(result.code).toBe('BAD_REQUEST')
  })
})
