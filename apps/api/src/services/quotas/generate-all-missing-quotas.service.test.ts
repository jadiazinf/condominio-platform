import { describe, it, expect, mock, beforeEach } from 'bun:test'
import { GenerateAllMissingQuotasService } from './generate-all-missing-quotas.service'

// ─────────────────────────────────────────────────────────────────────────────
// Mock helpers
// ─────────────────────────────────────────────────────────────────────────────

function createMockConcept(overrides: Record<string, unknown> = {}) {
  return {
    id: 'concept-1',
    condominiumId: 'condo-1',
    buildingId: null,
    name: 'Cuota Ordinaria',
    description: null,
    conceptType: 'condominium_fee' as const,
    isRecurring: true,
    recurrencePeriod: 'monthly',
    chargeGenerationStrategy: 'manual',
    currencyId: 'currency-1',
    allowsPartialPayment: false,
    latePaymentType: 'none',
    latePaymentValue: null,
    latePaymentGraceDays: 0,
    earlyPaymentType: 'none',
    earlyPaymentValue: null,
    earlyPaymentDaysBeforeDue: 0,
    issueDay: 1,
    dueDay: 15,
    effectiveFrom: '2026-01-01T00:00:00.000Z',
    effectiveUntil: '2026-12-31T00:00:00.000Z',
    isActive: true,
    metadata: null,
    createdBy: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

function createMockQuota(month: number) {
  return {
    id: `quota-${month}`,
    unitId: 'unit-1',
    paymentConceptId: 'concept-1',
    periodYear: 2026,
    periodMonth: month,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Test suite
// ─────────────────────────────────────────────────────────────────────────────

describe('GenerateAllMissingQuotasService', () => {
  let service: GenerateAllMissingQuotasService
  let mockConceptsRepo: { getById: ReturnType<typeof mock> }
  let mockGenerateOneExecute: ReturnType<typeof mock>

  const defaultInput = {
    unitId: 'unit-1',
    paymentConceptId: 'concept-1',
    periodYear: 2026,
    generatedBy: 'user-1',
  }

  beforeEach(() => {
    mockConceptsRepo = { getById: mock(() => null) }
    mockGenerateOneExecute = mock(() => null)

    service = new GenerateAllMissingQuotasService(
      {} as never, // db
      mockConceptsRepo as never,
      {} as never, // assignmentsRepo
      {} as never, // unitsRepo
      {} as never // quotasRepo
    )

    // Override the internal generateOne.execute
    ;(
      service as unknown as { generateOne: { execute: typeof mockGenerateOneExecute } }
    ).generateOne = {
      execute: mockGenerateOneExecute,
    }
  })

  // ─── Validation ──────────────────────────────────────────────────────────

  it('returns NOT_FOUND when concept does not exist', async () => {
    mockConceptsRepo.getById.mockResolvedValue(null)

    const result = await service.execute(defaultInput)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.code).toBe('NOT_FOUND')
    }
  })

  it('returns BAD_REQUEST when concept is inactive', async () => {
    mockConceptsRepo.getById.mockResolvedValue(createMockConcept({ isActive: false }))

    const result = await service.execute(defaultInput)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.code).toBe('BAD_REQUEST')
    }
  })

  // ─── Monthly recurrence ──────────────────────────────────────────────────

  it('generates 12 months for monthly concept with full year', async () => {
    mockConceptsRepo.getById.mockResolvedValue(createMockConcept())
    mockGenerateOneExecute.mockResolvedValue({
      success: true,
      data: { quota: createMockQuota(1) },
    })

    const result = await service.execute(defaultInput)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.created).toHaveLength(12)
      expect(mockGenerateOneExecute).toHaveBeenCalledTimes(12)
    }
  })

  it('generates months filtered by effectiveFrom mid-year', async () => {
    mockConceptsRepo.getById.mockResolvedValue(
      createMockConcept({ effectiveFrom: '2026-06-01T00:00:00.000Z' })
    )
    mockGenerateOneExecute.mockResolvedValue({
      success: true,
      data: { quota: createMockQuota(6) },
    })

    const result = await service.execute(defaultInput)

    expect(result.success).toBe(true)
    if (result.success) {
      // June through December = 7 months
      expect(result.data.created).toHaveLength(7)
    }
  })

  it('generates months filtered by effectiveUntil mid-year', async () => {
    mockConceptsRepo.getById.mockResolvedValue(
      createMockConcept({ effectiveUntil: '2026-06-15T00:00:00.000Z' })
    )
    mockGenerateOneExecute.mockResolvedValue({
      success: true,
      data: { quota: createMockQuota(1) },
    })

    const result = await service.execute(defaultInput)

    expect(result.success).toBe(true)
    if (result.success) {
      // January through June = 6 months
      expect(result.data.created).toHaveLength(6)
    }
  })

  // ─── Quarterly recurrence ────────────────────────────────────────────────

  it('generates 4 quarters for quarterly concept starting Jan', async () => {
    mockConceptsRepo.getById.mockResolvedValue(createMockConcept({ recurrencePeriod: 'quarterly' }))
    mockGenerateOneExecute.mockImplementation(async (input: { periodMonth: number }) => ({
      success: true,
      data: { quota: createMockQuota(input.periodMonth) },
    }))

    const result = await service.execute(defaultInput)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.created).toHaveLength(4)
      // Verify the actual months: starting from Jan (month 1), step 3 → 1, 4, 7, 10
      const months = result.data.created.map(q => q.periodMonth)
      expect(months).toEqual([1, 4, 7, 10])
    }
  })

  it('generates correct quarters for concept starting in February (BUG-03 regression)', async () => {
    // This was the critical bug: hardcoded [1,4,7,10] would return wrong months
    // when the concept starts in February
    mockConceptsRepo.getById.mockResolvedValue(
      createMockConcept({
        recurrencePeriod: 'quarterly',
        effectiveFrom: '2026-02-01T00:00:00.000Z',
      })
    )
    mockGenerateOneExecute.mockImplementation(async (input: { periodMonth: number }) => ({
      success: true,
      data: { quota: createMockQuota(input.periodMonth) },
    }))

    const result = await service.execute(defaultInput)

    expect(result.success).toBe(true)
    if (result.success) {
      // Starting from Feb, step 3 → 2, 5, 8, 11
      const months = result.data.created.map(q => q.periodMonth)
      expect(months).toEqual([2, 5, 8, 11])
    }
  })

  it('generates correct quarters for concept starting in March', async () => {
    mockConceptsRepo.getById.mockResolvedValue(
      createMockConcept({
        recurrencePeriod: 'quarterly',
        effectiveFrom: '2026-03-15T00:00:00.000Z',
      })
    )
    mockGenerateOneExecute.mockImplementation(async (input: { periodMonth: number }) => ({
      success: true,
      data: { quota: createMockQuota(input.periodMonth) },
    }))

    const result = await service.execute(defaultInput)

    expect(result.success).toBe(true)
    if (result.success) {
      // Starting from March, step 3 → 3, 6, 9, 12
      const months = result.data.created.map(q => q.periodMonth)
      expect(months).toEqual([3, 6, 9, 12])
    }
  })

  it('generates quarters limited by effectiveUntil', async () => {
    mockConceptsRepo.getById.mockResolvedValue(
      createMockConcept({
        recurrencePeriod: 'quarterly',
        effectiveFrom: '2026-02-01T00:00:00.000Z',
        effectiveUntil: '2026-06-30T00:00:00.000Z',
      })
    )
    mockGenerateOneExecute.mockImplementation(async (input: { periodMonth: number }) => ({
      success: true,
      data: { quota: createMockQuota(input.periodMonth) },
    }))

    const result = await service.execute(defaultInput)

    expect(result.success).toBe(true)
    if (result.success) {
      // Feb + May only (Aug would be month 8, past June effectiveUntil)
      const months = result.data.created.map(q => q.periodMonth)
      expect(months).toEqual([2, 5])
    }
  })

  // ─── Yearly recurrence ───────────────────────────────────────────────────

  it('generates 1 period for yearly concept', async () => {
    mockConceptsRepo.getById.mockResolvedValue(createMockConcept({ recurrencePeriod: 'yearly' }))
    mockGenerateOneExecute.mockResolvedValue({
      success: true,
      data: { quota: createMockQuota(1) },
    })

    const result = await service.execute(defaultInput)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.created).toHaveLength(1)
    }
  })

  it('generates yearly period respecting effectiveFrom month', async () => {
    mockConceptsRepo.getById.mockResolvedValue(
      createMockConcept({
        recurrencePeriod: 'yearly',
        effectiveFrom: '2026-06-01T00:00:00.000Z',
      })
    )
    mockGenerateOneExecute.mockImplementation(async (input: { periodMonth: number }) => ({
      success: true,
      data: { quota: createMockQuota(input.periodMonth) },
    }))

    const result = await service.execute(defaultInput)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.created).toHaveLength(1)
      // Should be month 6 (June), not month 1 (January)
      expect(result.data.created[0]?.periodMonth).toBe(6)
    }
  })

  // ─── No effectiveFrom ────────────────────────────────────────────────────

  it('defaults to January start when no effectiveFrom', async () => {
    mockConceptsRepo.getById.mockResolvedValue(
      createMockConcept({
        effectiveFrom: null,
        effectiveUntil: null,
      })
    )
    mockGenerateOneExecute.mockResolvedValue({
      success: true,
      data: { quota: createMockQuota(1) },
    })

    const result = await service.execute(defaultInput)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.created).toHaveLength(12)
    }
  })

  // ─── No applicable periods ───────────────────────────────────────────────

  it('returns BAD_REQUEST when effectiveFrom is after the requested year', async () => {
    mockConceptsRepo.getById.mockResolvedValue(
      createMockConcept({ effectiveFrom: '2027-01-01T00:00:00.000Z' })
    )

    const result = await service.execute(defaultInput)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.code).toBe('BAD_REQUEST')
      expect(result.error).toContain('No hay periodos aplicables')
    }
  })

  it('returns BAD_REQUEST when effectiveUntil is before the requested year', async () => {
    mockConceptsRepo.getById.mockResolvedValue(
      createMockConcept({ effectiveUntil: '2025-12-31T00:00:00.000Z' })
    )

    const result = await service.execute(defaultInput)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.code).toBe('BAD_REQUEST')
    }
  })

  // ─── Skipped and failed results ──────────────────────────────────────────

  it('tracks skipped (CONFLICT) and failed quotas separately', async () => {
    mockConceptsRepo.getById.mockResolvedValue(
      createMockConcept({
        recurrencePeriod: 'quarterly',
        effectiveFrom: '2026-01-01T00:00:00.000Z',
      })
    )

    let callCount = 0
    mockGenerateOneExecute.mockImplementation(async () => {
      callCount++
      if (callCount === 1) return { success: true, data: { quota: createMockQuota(1) } }
      if (callCount === 2) return { success: false, code: 'CONFLICT', error: 'Ya existe' }
      if (callCount === 3) return { success: false, code: 'NOT_FOUND', error: 'Assignment missing' }
      return { success: true, data: { quota: createMockQuota(10) } }
    })

    const result = await service.execute(defaultInput)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.created).toHaveLength(2)
      expect(result.data.skipped).toHaveLength(1)
      expect(result.data.skipped[0]?.month).toBe(4)
      expect(result.data.skipped[0]?.reason).toBe('Ya existe')
      expect(result.data.failed).toHaveLength(1)
      expect(result.data.failed[0]?.month).toBe(7)
      expect(result.data.failed[0]?.error).toBe('Assignment missing')
    }
  })

  // ─── Cross-year concept ──────────────────────────────────────────────────

  it('handles concept that started in a previous year', async () => {
    mockConceptsRepo.getById.mockResolvedValue(
      createMockConcept({
        recurrencePeriod: 'quarterly',
        effectiveFrom: '2025-03-01T00:00:00.000Z', // Started in 2025
        effectiveUntil: '2027-12-31T00:00:00.000Z',
      })
    )
    mockGenerateOneExecute.mockImplementation(async (input: { periodMonth: number }) => ({
      success: true,
      data: { quota: createMockQuota(input.periodMonth) },
    }))

    // Requesting year 2026
    const result = await service.execute(defaultInput)

    expect(result.success).toBe(true)
    if (result.success) {
      // From March 2025, step 3: Mar, Jun, Sep, Dec, Mar, Jun, Sep, Dec...
      // In 2026: 3, 6, 9, 12
      const months = result.data.created.map(q => q.periodMonth)
      expect(months).toEqual([3, 6, 9, 12])
    }
  })
})
