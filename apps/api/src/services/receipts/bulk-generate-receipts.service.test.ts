import { describe, it, expect, mock, beforeEach } from 'bun:test'
import { BulkGenerateReceiptsService } from './bulk-generate-receipts.service'

describe('BulkGenerateReceiptsService', () => {
  let service: BulkGenerateReceiptsService
  let generateReceiptService: Record<string, ReturnType<typeof mock>>
  let unitsRepo: Record<string, ReturnType<typeof mock>>
  let condominiumsRepo: Record<string, ReturnType<typeof mock>>

  const mockUnits = [
    { id: 'unit-1', buildingId: 'building-1', unitNumber: '101', aliquotPercentage: '10.00' },
    { id: 'unit-2', buildingId: 'building-1', unitNumber: '102', aliquotPercentage: '15.00' },
    { id: 'unit-3', buildingId: 'building-1', unitNumber: '103', aliquotPercentage: '12.00' },
  ]

  const mockCondominium = {
    id: 'condo-1',
    name: 'Residencias El Sol',
    defaultCurrencyId: 'currency-1',
  }

  const baseInput = {
    condominiumId: 'condo-1',
    periodYear: 2026,
    periodMonth: 3,
    currencyId: 'currency-1',
    budgetId: 'budget-1',
    generatedBy: 'admin-1',
  }

  beforeEach(() => {
    generateReceiptService = {
      execute: mock(() =>
        Promise.resolve({
          success: true,
          data: { id: 'receipt-1', status: 'generated' },
        })
      ),
    }

    unitsRepo = {
      getByCondominiumId: mock(() => Promise.resolve(mockUnits)),
    }

    condominiumsRepo = {
      getById: mock(() => Promise.resolve(mockCondominium)),
    }

    service = new BulkGenerateReceiptsService(
      generateReceiptService as never,
      unitsRepo as never,
      condominiumsRepo as never
    )
  })

  it('should generate receipts for all units in condominium', async () => {
    const result = await service.execute(baseInput)

    expect(result.success).toBe(true)
    if (!result.success) return

    expect(result.data.generated).toBe(3)
    expect(result.data.failed).toBe(0)
    expect(result.data.errors).toHaveLength(0)
    expect(generateReceiptService.execute).toHaveBeenCalledTimes(3)
  })

  it('should continue processing when individual receipt fails', async () => {
    let callCount = 0
    generateReceiptService.execute = mock(() => {
      callCount++
      if (callCount === 2) {
        return Promise.resolve({
          success: false,
          error: 'Receipt already exists',
          code: 'CONFLICT',
        })
      }
      return Promise.resolve({
        success: true,
        data: { id: `receipt-${callCount}`, status: 'generated' },
      })
    })

    service = new BulkGenerateReceiptsService(
      generateReceiptService as never,
      unitsRepo as never,
      condominiumsRepo as never
    )

    const result = await service.execute(baseInput)

    expect(result.success).toBe(true)
    if (!result.success) return

    expect(result.data.generated).toBe(2)
    expect(result.data.failed).toBe(1)
    expect(result.data.errors).toHaveLength(1)
    expect(result.data.errors[0]!.unitId).toBe('unit-2')
  })

  it('should fail if condominium not found', async () => {
    condominiumsRepo.getById = mock(() => Promise.resolve(null))

    service = new BulkGenerateReceiptsService(
      generateReceiptService as never,
      unitsRepo as never,
      condominiumsRepo as never
    )

    const result = await service.execute(baseInput)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.code).toBe('NOT_FOUND')
    }
  })

  it('should fail if no units found', async () => {
    unitsRepo.getByCondominiumId = mock(() => Promise.resolve([]))

    service = new BulkGenerateReceiptsService(
      generateReceiptService as never,
      unitsRepo as never,
      condominiumsRepo as never
    )

    const result = await service.execute(baseInput)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.code).toBe('BAD_REQUEST')
    }
  })
})
