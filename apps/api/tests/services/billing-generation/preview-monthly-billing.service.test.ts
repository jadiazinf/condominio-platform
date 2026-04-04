import { describe, it, expect, beforeEach } from 'bun:test'
import { PreviewMonthlyBillingService } from '@services/billing-generation/preview-monthly-billing.service'

const CONDO_ID = 'condo-1'

function makeUnit(id: string, number: string, aliquot: string) {
  return { id, unitNumber: number, aliquotPercentage: aliquot, buildingId: 'bld-1', isActive: true }
}

function makeChargeType(id: string, name: string, _category = 'ordinary') {
  return {
    id, condominiumId: CONDO_ID, name, categoryId: `cat-${_category}`,
    sortOrder: 0, isActive: true, createdAt: new Date(), updatedAt: new Date(),
  }
}

const DEFAULT_UNITS = [
  makeUnit('u1', 'A-101', '60.00'),
  makeUnit('u2', 'A-102', '40.00'),
]

const DEFAULT_CHARGE_TYPES = [
  makeChargeType('ct-1', 'Administración'),
  makeChargeType('ct-2', 'Electricidad'),
]

function createMocks(units = DEFAULT_UNITS, chargeTypes = DEFAULT_CHARGE_TYPES) {
  return {
    unitsRepo: {
      findByCondominium: async () => units,
      findByBuilding: async () => units,
    },
    chargeTypesRepo: {
      listByCondominium: async () => chargeTypes,
    },
  }
}

describe('PreviewMonthlyBillingService', () => {
  let service: PreviewMonthlyBillingService
  let mocks: ReturnType<typeof createMocks>

  beforeEach(() => {
    mocks = createMocks()
    service = new PreviewMonthlyBillingService(
      mocks.unitsRepo as never,
      mocks.chargeTypesRepo as never,
    )
  })

  it('distributes by aliquot and shows per-unit breakdown', async () => {
    const result = await service.execute({
      condominiumId: CONDO_ID,
      distributionMethod: 'by_aliquot',
      chargeAmounts: [
        { chargeTypeId: 'ct-1', amount: '1000.00' },
      ],
    })

    expect(result.success).toBe(true)
    if (!result.success) return

    expect(result.data.unitPreviews).toHaveLength(2)
    expect(result.data.unitPreviews[0].unitNumber).toBe('A-101')
    expect(result.data.unitPreviews[0].total).toBe('600.00')
    expect(result.data.unitPreviews[1].total).toBe('400.00')
    expect(result.data.grandTotal).toBe('1000.00')
  })

  it('distributes by equal_split', async () => {
    const result = await service.execute({
      condominiumId: CONDO_ID,
      distributionMethod: 'equal_split',
      chargeAmounts: [{ chargeTypeId: 'ct-1', amount: '1000.00' }],
    })

    expect(result.success).toBe(true)
    if (!result.success) return

    expect(result.data.unitPreviews[0].total).toBe('500.00')
    expect(result.data.unitPreviews[1].total).toBe('500.00')
  })

  it('handles multiple charge types', async () => {
    const result = await service.execute({
      condominiumId: CONDO_ID,
      distributionMethod: 'by_aliquot',
      chargeAmounts: [
        { chargeTypeId: 'ct-1', amount: '800.00' },
        { chargeTypeId: 'ct-2', amount: '200.00' },
      ],
    })

    expect(result.success).toBe(true)
    if (!result.success) return

    // U1: 60% of 800=480 + 60% of 200=120 = 600
    expect(result.data.unitPreviews[0].charges).toHaveLength(2)
    expect(result.data.unitPreviews[0].total).toBe('600.00')
    expect(result.data.grandTotal).toBe('1000.00')
  })

  it('calculates aliquot sum', async () => {
    const result = await service.execute({
      condominiumId: CONDO_ID,
      distributionMethod: 'by_aliquot',
      chargeAmounts: [{ chargeTypeId: 'ct-1', amount: '100.00' }],
    })

    expect(result.success).toBe(true)
    if (!result.success) return

    expect(result.data.aliquotSum).toBe('100.00') // 60 + 40
  })

  it('skips unknown charge type IDs', async () => {
    const result = await service.execute({
      condominiumId: CONDO_ID,
      distributionMethod: 'by_aliquot',
      chargeAmounts: [{ chargeTypeId: 'nonexistent', amount: '500.00' }],
    })

    expect(result.success).toBe(true)
    if (!result.success) return

    expect(result.data.grandTotal).toBe('0.00')
    expect(result.data.unitPreviews[0].charges).toHaveLength(0)
  })

  it('uses findByBuilding when buildingId provided', async () => {
    let usedBuilding = false
    mocks.unitsRepo.findByBuilding = async () => {
      usedBuilding = true
      return [makeUnit('u1', 'B-101', '100.00')]
    }

    await service.execute({
      condominiumId: CONDO_ID,
      buildingId: 'bld-1',
      distributionMethod: 'by_aliquot',
      chargeAmounts: [{ chargeTypeId: 'ct-1', amount: '100.00' }],
    })

    expect(usedBuilding).toBe(true)
  })
})
