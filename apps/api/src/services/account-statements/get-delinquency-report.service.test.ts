import { describe, it, expect, mock, beforeEach } from 'bun:test'
import { GetDelinquencyReportService } from './get-delinquency-report.service'

// ─────────────────────────────────────────────────────────────────────────────
// Mock helpers
// ─────────────────────────────────────────────────────────────────────────────

function createOverdueQuota(overrides: Record<string, unknown> = {}) {
  return {
    id: 'quota-1',
    unitId: 'unit-1',
    paymentConceptId: 'concept-1',
    periodYear: 2026,
    periodMonth: 1,
    periodDescription: 'January 2026',
    baseAmount: '1000.00',
    currencyId: 'currency-1',
    interestAmount: '50.00',
    amountInBaseCurrency: null,
    exchangeRateUsed: null,
    issueDate: '2026-01-01',
    dueDate: '2026-01-15',
    status: 'overdue',
    adjustmentsTotal: '0',
    paidAmount: '0',
    balance: '1050.00',
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

describe('GetDelinquencyReportService', () => {
  let service: GetDelinquencyReportService
  let mockQuotasRepo: Record<string, ReturnType<typeof mock>>
  let mockUnitsRepo: Record<string, ReturnType<typeof mock>>
  let mockBuildingsRepo: Record<string, ReturnType<typeof mock>>

  const defaultInput = {
    condominiumId: 'condo-1',
    asOfDate: '2026-03-31',
  }

  beforeEach(() => {
    mockQuotasRepo = {
      getOverdue: mock(() => []),
    }
    mockUnitsRepo = {
      getByCondominiumId: mock(() => [
        {
          id: 'unit-1',
          unitNumber: '1A',
          buildingId: 'building-1',
          aliquotPercentage: '10.00',
          isActive: true,
        },
        {
          id: 'unit-2',
          unitNumber: '2B',
          buildingId: 'building-1',
          aliquotPercentage: '15.00',
          isActive: true,
        },
        {
          id: 'unit-3',
          unitNumber: '3C',
          buildingId: 'building-2',
          aliquotPercentage: '8.00',
          isActive: true,
        },
      ]),
    }

    mockBuildingsRepo = {
      getByCondominiumId: mock(() => [
        { id: 'building-1', name: 'Torre A' },
        { id: 'building-2', name: 'Torre B' },
      ]),
    }

    service = new GetDelinquencyReportService(
      mockQuotasRepo as never,
      mockUnitsRepo as never,
      mockBuildingsRepo as never
    )
  })

  // ─── Empty state ─────────────────────────────────────────────────────────

  it('returns empty report when no overdue quotas exist', async () => {
    const result = await service.execute(defaultInput)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.delinquentUnits).toHaveLength(0)
      expect(result.data.summary.totalDelinquent).toBe('0.00')
      expect(result.data.summary.delinquentUnitCount).toBe(0)
      expect(result.data.summary.collectionRate).toBe('100.00')
    }
  })

  // ─── Single unit delinquent ──────────────────────────────────────────────

  it('reports a single delinquent unit with aging breakdown', async () => {
    mockQuotasRepo.getOverdue!.mockResolvedValue([
      // 75 days overdue (Jan 15 → Mar 31)
      createOverdueQuota({
        id: 'q-1',
        unitId: 'unit-1',
        dueDate: '2026-01-15',
        balance: '1050.00',
      }),
      // 44 days overdue (Feb 15 → Mar 31)
      createOverdueQuota({
        id: 'q-2',
        unitId: 'unit-1',
        dueDate: '2026-02-15',
        balance: '800.00',
        periodMonth: 2,
        periodDescription: 'February 2026',
        interestAmount: '0',
      }),
    ])

    const result = await service.execute(defaultInput)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.delinquentUnits).toHaveLength(1)

      const unit = result.data.delinquentUnits[0]!
      expect(unit.unitId).toBe('unit-1')
      expect(unit.unitNumber).toBe('1A')
      expect(unit.totalDebt).toBe('1850.00')
      expect(unit.overdueQuotaCount).toBe(2)
    }
  })

  // ─── Multiple units ──────────────────────────────────────────────────────

  it('groups overdue quotas by unit and sorts by total debt descending', async () => {
    mockQuotasRepo.getOverdue!.mockResolvedValue([
      createOverdueQuota({ id: 'q-1', unitId: 'unit-1', balance: '500.00' }),
      createOverdueQuota({ id: 'q-2', unitId: 'unit-2', balance: '2000.00' }),
      createOverdueQuota({ id: 'q-3', unitId: 'unit-2', balance: '1000.00', periodMonth: 2 }),
    ])

    const result = await service.execute(defaultInput)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.delinquentUnits).toHaveLength(2)
      // Unit-2 has more debt, should be first
      expect(result.data.delinquentUnits[0]!.unitId).toBe('unit-2')
      expect(result.data.delinquentUnits[0]!.totalDebt).toBe('3000.00')
      expect(result.data.delinquentUnits[1]!.unitId).toBe('unit-1')
      expect(result.data.delinquentUnits[1]!.totalDebt).toBe('500.00')
    }
  })

  // ─── Summary metrics ────────────────────────────────────────────────────

  it('calculates summary: total delinquent, unit count, collection rate', async () => {
    mockQuotasRepo.getOverdue!.mockResolvedValue([
      createOverdueQuota({
        id: 'q-1',
        unitId: 'unit-1',
        balance: '1000.00',
        baseAmount: '1000.00',
        paidAmount: '0',
      }),
      createOverdueQuota({
        id: 'q-2',
        unitId: 'unit-2',
        balance: '500.00',
        baseAmount: '1000.00',
        paidAmount: '500.00',
      }),
    ])

    const result = await service.execute(defaultInput)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.summary.totalDelinquent).toBe('1500.00')
      expect(result.data.summary.delinquentUnitCount).toBe(2)
      expect(result.data.summary.totalUnits).toBe(3)
      // Collection rate = totalPaid / totalCharged * 100
      // totalCharged = 1000 + 1000 = 2000, totalPaid = 0 + 500 = 500
      // rate = 500/2000 * 100 = 25.00
      expect(result.data.summary.collectionRate).toBe('25.00')
    }
  })

  // ─── Filter by building ──────────────────────────────────────────────────

  it('filters delinquent units by building when buildingId provided', async () => {
    mockQuotasRepo.getOverdue!.mockResolvedValue([
      createOverdueQuota({ id: 'q-1', unitId: 'unit-1', balance: '500.00' }), // building-1
      createOverdueQuota({ id: 'q-2', unitId: 'unit-3', balance: '300.00' }), // building-2
    ])

    const result = await service.execute({ ...defaultInput, buildingId: 'building-1' })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.delinquentUnits).toHaveLength(1)
      expect(result.data.delinquentUnits[0]!.unitId).toBe('unit-1')
    }
  })

  // ─── Oldest due date ────────────────────────────────────────────────────

  it('includes oldest due date and max days overdue per unit', async () => {
    mockQuotasRepo.getOverdue!.mockResolvedValue([
      createOverdueQuota({
        id: 'q-old',
        unitId: 'unit-1',
        dueDate: '2025-12-15',
        balance: '1000.00',
        periodYear: 2025,
        periodMonth: 12,
      }),
      createOverdueQuota({
        id: 'q-new',
        unitId: 'unit-1',
        dueDate: '2026-02-15',
        balance: '500.00',
        periodMonth: 2,
      }),
    ])

    const result = await service.execute(defaultInput)

    expect(result.success).toBe(true)
    if (result.success) {
      const unit = result.data.delinquentUnits[0]!
      expect(unit.oldestDueDate).toBe('2025-12-15')
      expect(unit.maxDaysOverdue).toBe(106) // Dec 15 → Mar 31
    }
  })
})
