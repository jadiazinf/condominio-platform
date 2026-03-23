import { describe, it, expect, mock, beforeEach } from 'bun:test'
import { AdjustQuotaService } from './adjust-quota.service'

// ─────────────────────────────────────────────────────────────────────────────
// Mock helpers
// ─────────────────────────────────────────────────────────────────────────────

function createMockQuota(overrides: Record<string, unknown> = {}) {
  return {
    id: 'quota-1',
    unitId: 'unit-1',
    paymentConceptId: 'concept-1',
    periodYear: 2026,
    periodMonth: 3,
    periodDescription: 'March 2026',
    baseAmount: '1000.00',
    currencyId: 'currency-1',
    interestAmount: '50.00',
    amountInBaseCurrency: null,
    exchangeRateUsed: null,
    issueDate: '2026-03-01',
    dueDate: '2026-03-15',
    status: 'overdue' as const,
    adjustmentsTotal: '0',
    paidAmount: '200.00',
    balance: '850.00',
    notes: null,
    metadata: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: null,
    ...overrides,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Test suite
// ─────────────────────────────────────────────────────────────────────────────

describe('AdjustQuotaService', () => {
  let service: AdjustQuotaService
  let mockQuotasRepo: {
    getById: ReturnType<typeof mock>
    update: ReturnType<typeof mock>
    withTx: ReturnType<typeof mock>
  }
  let mockAdjustmentsRepo: { create: ReturnType<typeof mock>; withTx: ReturnType<typeof mock> }
  let mockDb: { transaction: (fn: (tx: unknown) => Promise<unknown>) => Promise<unknown> }

  const defaultInput = {
    quotaId: 'quota-1',
    newAmount: '800.00',
    adjustmentType: 'discount' as const,
    reason: 'Descuento por pronto pago',
    adjustedByUserId: 'user-1',
  }

  beforeEach(() => {
    mockQuotasRepo = {
      getById: mock(() => null),
      update: mock(() => null),
      withTx: mock(() => mockQuotasRepo),
    }
    mockAdjustmentsRepo = {
      create: mock(() => ({ id: 'adj-1', ...defaultInput })),
      withTx: mock(() => mockAdjustmentsRepo),
    }
    mockDb = {
      transaction: async fn => fn({}),
    }

    service = new AdjustQuotaService(
      mockDb as never,
      mockQuotasRepo as never,
      mockAdjustmentsRepo as never
    )
  })

  // ─── Validation ──────────────────────────────────────────────────────────

  it('returns NOT_FOUND when quota does not exist', async () => {
    mockQuotasRepo.getById.mockResolvedValue(null)

    const result = await service.execute(defaultInput)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.code).toBe('NOT_FOUND')
    }
  })

  it('returns BAD_REQUEST when quota is cancelled', async () => {
    mockQuotasRepo.getById.mockResolvedValue(createMockQuota({ status: 'cancelled' }))

    const result = await service.execute(defaultInput)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.code).toBe('BAD_REQUEST')
      expect(result.error).toContain('cancelled')
    }
  })

  it('returns BAD_REQUEST when quota is exonerated', async () => {
    mockQuotasRepo.getById.mockResolvedValue(createMockQuota({ status: 'exonerated' }))

    const result = await service.execute(defaultInput)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.code).toBe('BAD_REQUEST')
      expect(result.error).toContain('exonerated')
    }
  })

  it('returns BAD_REQUEST when new amount equals current effective amount', async () => {
    // baseAmount=1000, adjustmentsTotal=0 → effective=1000
    mockQuotasRepo.getById.mockResolvedValue(createMockQuota())

    const result = await service.execute({ ...defaultInput, newAmount: '1000.00' })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.code).toBe('BAD_REQUEST')
      expect(result.error).toContain('different')
    }
  })

  it('returns BAD_REQUEST when new amount is negative for non-waiver/exoneration', async () => {
    mockQuotasRepo.getById.mockResolvedValue(createMockQuota())

    const result = await service.execute({
      ...defaultInput,
      newAmount: '-100.00',
      adjustmentType: 'discount',
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.code).toBe('BAD_REQUEST')
      expect(result.error).toContain('negative')
    }
  })

  // ─── Waiver validations ─────────────────────────────────────────────────

  it('returns BAD_REQUEST when waiver amount is not 0', async () => {
    mockQuotasRepo.getById.mockResolvedValue(createMockQuota())

    const result = await service.execute({
      ...defaultInput,
      newAmount: '500.00',
      adjustmentType: 'waiver',
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain('0')
    }
  })

  it('returns BAD_REQUEST when exoneration amount is not 0', async () => {
    mockQuotasRepo.getById.mockResolvedValue(createMockQuota())

    const result = await service.execute({
      ...defaultInput,
      newAmount: '500.00',
      adjustmentType: 'exoneration',
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain('0')
    }
  })

  // ─── Successful adjustments ─────────────────────────────────────────────

  it('creates a discount adjustment correctly', async () => {
    mockQuotasRepo.getById.mockResolvedValue(createMockQuota())

    const result = await service.execute(defaultInput) // newAmount=800

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.message).toContain('800')
      expect(result.data.message).toContain('1000')
    }
    // Check quota update was called with correct values
    // newAdjTotal = 800 - 1000 = -200, newBalance = 800 + 50 - 200 = 650
    expect(mockQuotasRepo.update).toHaveBeenCalledTimes(1)
    const updateCall = mockQuotasRepo.update.mock.calls[0]!
    expect(updateCall[0]).toBe('quota-1')
    expect(updateCall[1].adjustmentsTotal).toBe('-200.00')
    expect(updateCall[1].balance).toBe('650.00')
  })

  it('creates an increase adjustment correctly', async () => {
    mockQuotasRepo.getById.mockResolvedValue(createMockQuota())

    const result = await service.execute({
      ...defaultInput,
      newAmount: '1500.00',
      adjustmentType: 'increase',
    })

    expect(result.success).toBe(true)
    // newAdjTotal = 1500 - 1000 = 500, newBalance = 1500 + 50 - 200 = 1350
    const updateCall = mockQuotasRepo.update.mock.calls[0]!
    expect(updateCall[1].adjustmentsTotal).toBe('500.00')
    expect(updateCall[1].balance).toBe('1350.00')
  })

  it('sets status to paid when balance reaches 0 after discount', async () => {
    // baseAmount=1000, paidAmount=900, interestAmount=0
    mockQuotasRepo.getById.mockResolvedValue(
      createMockQuota({ paidAmount: '900.00', interestAmount: '0', balance: '100.00' })
    )

    const result = await service.execute({
      ...defaultInput,
      newAmount: '900.00', // effective amount matches paid → balance = 0
    })

    expect(result.success).toBe(true)
    const updateCall = mockQuotasRepo.update.mock.calls[0]!
    expect(updateCall[1].status).toBe('paid')
    expect(updateCall[1].balance).toBe('0.00')
  })

  // ─── Waiver ─────────────────────────────────────────────────────────────

  it('waiver sets amount to 0 and status to cancelled', async () => {
    mockQuotasRepo.getById.mockResolvedValue(createMockQuota())

    const result = await service.execute({
      ...defaultInput,
      newAmount: '0',
      adjustmentType: 'waiver',
      reason: 'Condonación por asamblea',
    })

    expect(result.success).toBe(true)
    const updateCall = mockQuotasRepo.update.mock.calls[0]!
    expect(updateCall[1].status).toBe('cancelled')
    // newBalance = 0 + 50(interest) - 200(paid) = -150
    expect(updateCall[1].adjustmentsTotal).toBe('-1000.00')
  })

  // ─── Exoneration ────────────────────────────────────────────────────────

  it('exoneration sets amount to 0, clears interest, and status to exonerated', async () => {
    mockQuotasRepo.getById.mockResolvedValue(createMockQuota())

    const result = await service.execute({
      ...defaultInput,
      newAmount: '0',
      adjustmentType: 'exoneration',
      reason: 'Exoneración por directiva',
    })

    expect(result.success).toBe(true)
    const updateCall = mockQuotasRepo.update.mock.calls[0]!
    expect(updateCall[1].status).toBe('exonerated')
    expect(updateCall[1].interestAmount).toBe('0')
    // For exoneration, interest is wiped: newBalance = 0 + 0(effectiveInterest) - 200(paid) = -200
    expect(updateCall[1].adjustmentsTotal).toBe('-1000.00')
  })

  // ─── Quota with existing adjustments ────────────────────────────────────

  it('handles quota that already has adjustments', async () => {
    // baseAmount=1000, adjustmentsTotal=-200 → effective=800
    mockQuotasRepo.getById.mockResolvedValue(
      createMockQuota({ adjustmentsTotal: '-200.00', balance: '650.00' })
    )

    const result = await service.execute({
      ...defaultInput,
      newAmount: '600.00', // reduce effective from 800 to 600
    })

    expect(result.success).toBe(true)
    // newAdjTotal = 600 - 1000 = -400
    const updateCall = mockQuotasRepo.update.mock.calls[0]!
    expect(updateCall[1].adjustmentsTotal).toBe('-400.00')
  })

  // ─── Audit record ──────────────────────────────────────────────────────

  it('creates adjustment record with correct previous and new amounts', async () => {
    mockQuotasRepo.getById.mockResolvedValue(createMockQuota())

    await service.execute(defaultInput) // newAmount=800

    expect(mockAdjustmentsRepo.create).toHaveBeenCalledTimes(1)
    const createCall = mockAdjustmentsRepo.create.mock.calls[0]!
    expect(createCall[0].quotaId).toBe('quota-1')
    expect(createCall[0].previousAmount).toBe('1000.00')
    expect(createCall[0].newAmount).toBe('800.00')
    expect(createCall[0].adjustmentType).toBe('discount')
    expect(createCall[0].reason).toBe('Descuento por pronto pago')
    expect(createCall[0].createdBy).toBe('user-1')
  })
})
