import { describe, it, expect, mock, beforeEach } from 'bun:test'
import { GenerateCondominiumReceiptService } from './generate-condominium-receipt.service'

describe('GenerateCondominiumReceiptService', () => {
  let service: GenerateCondominiumReceiptService
  let receiptsRepo: {
    getByUnitAndPeriod: ReturnType<typeof mock>
    create: ReturnType<typeof mock>
    getByCondominiumAndPeriod: ReturnType<typeof mock>
  }
  let quotasRepo: {
    getByUnitAndPeriod: ReturnType<typeof mock>
    getPendingByUnit: ReturnType<typeof mock>
  }
  let unitsRepo: {
    getById: ReturnType<typeof mock>
  }
  let buildingsRepo: {
    getById: ReturnType<typeof mock>
  }

  const mockUnit = {
    id: 'unit-1',
    buildingId: 'building-1',
    unitNumber: '101',
    aliquotPercentage: '12.50',
  }

  const mockBuilding = {
    id: 'building-1',
    condominiumId: 'condo-1',
    name: 'Torre A',
  }

  const mockQuotasForPeriod = [
    {
      id: 'quota-1',
      unitId: 'unit-1',
      paymentConceptId: 'concept-1',
      periodYear: 2026,
      periodMonth: 3,
      baseAmount: '500.00',
      interestAmount: '0',
      balance: '500.00',
      status: 'pending',
      paymentConcept: { name: 'Cuota ordinaria', conceptType: 'condominium_fee' },
    },
    {
      id: 'quota-2',
      unitId: 'unit-1',
      paymentConceptId: 'concept-2',
      periodYear: 2026,
      periodMonth: 3,
      baseAmount: '200.00',
      interestAmount: '0',
      balance: '200.00',
      status: 'pending',
      paymentConcept: { name: 'Fondo de reserva', conceptType: 'reserve_fund' },
    },
    {
      id: 'quota-3',
      unitId: 'unit-1',
      paymentConceptId: 'concept-3',
      periodYear: 2026,
      periodMonth: 3,
      baseAmount: '150.00',
      interestAmount: '0',
      balance: '150.00',
      status: 'pending',
      paymentConcept: { name: 'Cuota extraordinaria', conceptType: 'extraordinary' },
    },
  ]

  // Previous unpaid quotas from prior periods
  const mockPreviousUnpaidQuotas = [
    {
      id: 'old-quota-1',
      unitId: 'unit-1',
      balance: '300.00',
      periodYear: 2026,
      periodMonth: 2,
      status: 'overdue',
    },
  ]

  const baseInput = {
    condominiumId: 'condo-1',
    unitId: 'unit-1',
    periodYear: 2026,
    periodMonth: 3,
    currencyId: 'currency-1',
    budgetId: 'budget-1',
    generatedBy: 'admin-1',
  }

  beforeEach(() => {
    receiptsRepo = {
      getByUnitAndPeriod: mock(() => Promise.resolve(null)),
      create: mock((data: Record<string, unknown>) =>
        Promise.resolve({
          id: 'receipt-1',
          ...data,
          status: 'generated',
          createdAt: new Date(),
          updatedAt: new Date(),
        })
      ),
      getByCondominiumAndPeriod: mock(() => Promise.resolve([])),
    }

    quotasRepo = {
      getByUnitAndPeriod: mock(() => Promise.resolve(mockQuotasForPeriod)),
      getPendingByUnit: mock(() => Promise.resolve(mockPreviousUnpaidQuotas)),
    }

    unitsRepo = {
      getById: mock(() => Promise.resolve(mockUnit)),
    }

    buildingsRepo = {
      getById: mock(() => Promise.resolve(mockBuilding)),
    }

    service = new GenerateCondominiumReceiptService(
      receiptsRepo as never,
      quotasRepo as never,
      unitsRepo as never,
      buildingsRepo as never
    )
  })

  it('should generate a receipt with correct amounts breakdown', async () => {
    const result = await service.execute(baseInput)

    expect(result.success).toBe(true)
    if (!result.success) return

    // Verify receipt was created
    expect(receiptsRepo.create).toHaveBeenCalledTimes(1)
    const createCall = receiptsRepo.create.mock.calls[0]![0]

    // Ordinary: 500 (condominium_fee)
    expect(createCall.ordinaryAmount).toBe('500.00')
    // Reserve fund: 200
    expect(createCall.reserveFundAmount).toBe('200.00')
    // Extraordinary: 150
    expect(createCall.extraordinaryAmount).toBe('150.00')
    // Interest: 0
    expect(createCall.interestAmount).toBe('0.00')
    // Fines: 0
    expect(createCall.finesAmount).toBe('0.00')
    // Previous balance: 300 (from overdue quota)
    expect(createCall.previousBalance).toBe('300.00')
    // Total: 500 + 200 + 150 + 0 + 0 + 300 = 1150
    expect(createCall.totalAmount).toBe('1150.00')
    // Unit aliquot snapshot
    expect(createCall.unitAliquot).toBe('12.50')
    // Status
    expect(createCall.status).toBe('generated')

    // Receipt items are no longer stored — breakdown is calculated on-the-fly from quotas
  })

  it('should fail if receipt already exists for unit+period', async () => {
    receiptsRepo.getByUnitAndPeriod = mock(() =>
      Promise.resolve({ id: 'existing-receipt', status: 'generated' })
    )

    service = new GenerateCondominiumReceiptService(
      receiptsRepo as never,
      quotasRepo as never,
      unitsRepo as never,
      buildingsRepo as never
    )

    const result = await service.execute(baseInput)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.code).toBe('CONFLICT')
    }
  })

  it('should fail if unit not found', async () => {
    unitsRepo.getById = mock(() => Promise.resolve(null))

    service = new GenerateCondominiumReceiptService(
      receiptsRepo as never,
      quotasRepo as never,
      unitsRepo as never,
      buildingsRepo as never
    )

    const result = await service.execute(baseInput)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.code).toBe('NOT_FOUND')
    }
  })

  it('should fail if no quotas exist for the period', async () => {
    quotasRepo.getByUnitAndPeriod = mock(() => Promise.resolve([]))

    service = new GenerateCondominiumReceiptService(
      receiptsRepo as never,
      quotasRepo as never,
      unitsRepo as never,
      buildingsRepo as never
    )

    const result = await service.execute(baseInput)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.code).toBe('BAD_REQUEST')
    }
  })

  it('should generate receipt with zero previous balance when no prior debt', async () => {
    quotasRepo.getPendingByUnit = mock(() => Promise.resolve([]))

    service = new GenerateCondominiumReceiptService(
      receiptsRepo as never,
      quotasRepo as never,
      unitsRepo as never,
      buildingsRepo as never
    )

    const result = await service.execute(baseInput)

    expect(result.success).toBe(true)
    if (!result.success) return

    const createCall = receiptsRepo.create.mock.calls[0]![0]
    expect(createCall.previousBalance).toBe('0.00')
    // Total: 500 + 200 + 150 = 850 (no previous balance)
    expect(createCall.totalAmount).toBe('850.00')

    // Receipt items are no longer stored — breakdown is calculated on-the-fly from quotas
  })

  it('should handle quotas with interest amounts', async () => {
    const quotasWithInterest = [
      {
        ...mockQuotasForPeriod[0],
        interestAmount: '50.00',
      },
      mockQuotasForPeriod[1],
    ]
    quotasRepo.getByUnitAndPeriod = mock(() => Promise.resolve(quotasWithInterest))
    quotasRepo.getPendingByUnit = mock(() => Promise.resolve([]))

    service = new GenerateCondominiumReceiptService(
      receiptsRepo as never,
      quotasRepo as never,
      unitsRepo as never,
      buildingsRepo as never
    )

    const result = await service.execute(baseInput)

    expect(result.success).toBe(true)
    if (!result.success) return

    const createCall = receiptsRepo.create.mock.calls[0]![0]
    expect(createCall.interestAmount).toBe('50.00')
    // Total: 500 + 200 + 50 = 750
    expect(createCall.totalAmount).toBe('750.00')
  })

  it('should generate a unique receipt number', async () => {
    const result = await service.execute(baseInput)

    expect(result.success).toBe(true)
    if (!result.success) return

    const createCall = receiptsRepo.create.mock.calls[0]![0]
    // Receipt number should contain period info
    expect(createCall.receiptNumber).toContain('2026')
    expect(createCall.receiptNumber).toContain('03')
    expect(createCall.receiptNumber.length).toBeGreaterThan(0)
  })

  it('should allow regenerating a voided receipt', async () => {
    receiptsRepo.getByUnitAndPeriod = mock(() =>
      Promise.resolve({ id: 'voided-receipt', status: 'voided' })
    )

    service = new GenerateCondominiumReceiptService(
      receiptsRepo as never,
      quotasRepo as never,
      unitsRepo as never,
      buildingsRepo as never
    )

    const result = await service.execute(baseInput)

    // Should succeed because existing receipt is voided
    expect(result.success).toBe(true)
  })
})
