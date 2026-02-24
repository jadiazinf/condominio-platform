import { describe, it, expect } from 'bun:test'
import {
  calculateUnitCharges,
  calculateElapsedPeriods,
  type TUnitInfo,
} from '@src/services/payment-concepts/calculate-unit-charges'
import type { TPaymentConceptAssignment } from '@packages/domain'

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function makeUnit(overrides: Partial<TUnitInfo> & { id: string }): TUnitInfo {
  return {
    buildingId: 'bld-1',
    unitNumber: '1A',
    aliquotPercentage: null,
    isActive: true,
    ...overrides,
  }
}

function makeAssignment(
  overrides: Partial<TPaymentConceptAssignment> = {}
): TPaymentConceptAssignment {
  return {
    id: 'assignment-1',
    paymentConceptId: 'concept-1',
    scopeType: 'condominium',
    condominiumId: 'condo-1',
    buildingId: null,
    unitId: null,
    distributionMethod: 'fixed_per_unit',
    amount: 100,
    isActive: true,
    assignedBy: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// calculateUnitCharges
// ─────────────────────────────────────────────────────────────────────────────

describe('calculateUnitCharges', function () {
  describe('fixed_per_unit distribution', function () {
    it('should assign the full amount to each unit', function () {
      const units: TUnitInfo[] = [
        makeUnit({ id: 'u1', unitNumber: '1A' }),
        makeUnit({ id: 'u2', unitNumber: '1B' }),
        makeUnit({ id: 'u3', unitNumber: '1C' }),
      ]
      const assignments = [makeAssignment({ amount: 500 })]
      const unitsByBuilding = new Map([['bld-1', units]])

      const result = calculateUnitCharges(assignments, units, unitsByBuilding)

      expect(result).toHaveLength(3)
      for (const r of result) {
        expect(r.baseAmount).toBe(500)
      }
    })
  })

  describe('equal_split distribution', function () {
    it('should divide equally among units', function () {
      const units: TUnitInfo[] = [
        makeUnit({ id: 'u1', unitNumber: '1A' }),
        makeUnit({ id: 'u2', unitNumber: '1B' }),
      ]
      const assignments = [
        makeAssignment({ distributionMethod: 'equal_split', amount: 1000 }),
      ]
      const unitsByBuilding = new Map([['bld-1', units]])

      const result = calculateUnitCharges(assignments, units, unitsByBuilding)

      expect(result).toHaveLength(2)
      expect(result[0]!.baseAmount).toBe(500)
      expect(result[1]!.baseAmount).toBe(500)
    })

    it('should give penny remainder to the last unit', function () {
      const units: TUnitInfo[] = [
        makeUnit({ id: 'u1', unitNumber: '1A' }),
        makeUnit({ id: 'u2', unitNumber: '1B' }),
        makeUnit({ id: 'u3', unitNumber: '1C' }),
      ]
      const assignments = [
        makeAssignment({ distributionMethod: 'equal_split', amount: 100 }),
      ]
      const unitsByBuilding = new Map([['bld-1', units]])

      const result = calculateUnitCharges(assignments, units, unitsByBuilding)

      expect(result).toHaveLength(3)
      // 100 / 3 = 33.33 each, last unit gets 33.34
      expect(result[0]!.baseAmount).toBe(33.33)
      expect(result[1]!.baseAmount).toBe(33.33)
      expect(result[2]!.baseAmount).toBe(33.34)
      // Total should equal exactly the assignment amount
      const total = result.reduce((sum, r) => sum + r.baseAmount, 0)
      expect(Math.round(total * 100) / 100).toBe(100)
    })
  })

  describe('by_aliquot distribution', function () {
    it('should distribute proportionally by aliquot', function () {
      const units: TUnitInfo[] = [
        makeUnit({ id: 'u1', unitNumber: '1A', aliquotPercentage: '30.000000' }),
        makeUnit({ id: 'u2', unitNumber: '1B', aliquotPercentage: '70.000000' }),
      ]
      const assignments = [
        makeAssignment({ distributionMethod: 'by_aliquot', amount: 1000 }),
      ]
      const unitsByBuilding = new Map([['bld-1', units]])

      const result = calculateUnitCharges(assignments, units, unitsByBuilding)

      expect(result).toHaveLength(2)
      expect(result[0]!.baseAmount).toBe(300)
      expect(result[1]!.baseAmount).toBe(700)
    })

    it('should handle penny remainder on last unit', function () {
      const units: TUnitInfo[] = [
        makeUnit({ id: 'u1', unitNumber: '1A', aliquotPercentage: '33.333333' }),
        makeUnit({ id: 'u2', unitNumber: '1B', aliquotPercentage: '33.333333' }),
        makeUnit({ id: 'u3', unitNumber: '1C', aliquotPercentage: '33.333334' }),
      ]
      const assignments = [
        makeAssignment({ distributionMethod: 'by_aliquot', amount: 1000 }),
      ]
      const unitsByBuilding = new Map([['bld-1', units]])

      const result = calculateUnitCharges(assignments, units, unitsByBuilding)

      expect(result).toHaveLength(3)
      const total = result.reduce((sum, r) => sum + r.baseAmount, 0)
      expect(Math.round(total * 100) / 100).toBe(1000)
    })

    it('should skip units without aliquot', function () {
      const units: TUnitInfo[] = [
        makeUnit({ id: 'u1', unitNumber: '1A', aliquotPercentage: '50.000000' }),
        makeUnit({ id: 'u2', unitNumber: '1B', aliquotPercentage: null }),
        makeUnit({ id: 'u3', unitNumber: '1C', aliquotPercentage: '50.000000' }),
      ]
      const assignments = [
        makeAssignment({ distributionMethod: 'by_aliquot', amount: 1000 }),
      ]
      const unitsByBuilding = new Map([['bld-1', units]])

      const result = calculateUnitCharges(assignments, units, unitsByBuilding)

      expect(result).toHaveLength(2)
      expect(result[0]!.baseAmount).toBe(500)
      expect(result[1]!.baseAmount).toBe(500)
    })
  })

  describe('override hierarchy', function () {
    it('should let building-level override condominium-level', function () {
      const units: TUnitInfo[] = [
        makeUnit({ id: 'u1', buildingId: 'bld-1', unitNumber: '1A' }),
        makeUnit({ id: 'u2', buildingId: 'bld-1', unitNumber: '1B' }),
        makeUnit({ id: 'u3', buildingId: 'bld-2', unitNumber: '2A' }),
      ]
      const unitsByBuilding = new Map([
        ['bld-1', [units[0]!, units[1]!]],
        ['bld-2', [units[2]!]],
      ])

      const assignments = [
        makeAssignment({
          id: 'a1',
          scopeType: 'condominium',
          distributionMethod: 'fixed_per_unit',
          amount: 100,
        }),
        makeAssignment({
          id: 'a2',
          scopeType: 'building',
          buildingId: 'bld-1',
          distributionMethod: 'fixed_per_unit',
          amount: 200,
        }),
      ]

      const result = calculateUnitCharges(assignments, units, unitsByBuilding)

      const u1 = result.find(r => r.unitId === 'u1')!
      const u2 = result.find(r => r.unitId === 'u2')!
      const u3 = result.find(r => r.unitId === 'u3')!

      expect(u1.baseAmount).toBe(200) // overridden by building
      expect(u2.baseAmount).toBe(200) // overridden by building
      expect(u3.baseAmount).toBe(100) // still condominium-level
    })

    it('should let unit-level override building-level', function () {
      const units: TUnitInfo[] = [
        makeUnit({ id: 'u1', buildingId: 'bld-1', unitNumber: '1A' }),
        makeUnit({ id: 'u2', buildingId: 'bld-1', unitNumber: '1B' }),
      ]
      const unitsByBuilding = new Map([['bld-1', units]])

      const assignments = [
        makeAssignment({
          id: 'a1',
          scopeType: 'building',
          buildingId: 'bld-1',
          distributionMethod: 'fixed_per_unit',
          amount: 300,
        }),
        makeAssignment({
          id: 'a2',
          scopeType: 'unit',
          unitId: 'u1',
          amount: 999,
        }),
      ]

      const result = calculateUnitCharges(assignments, units, unitsByBuilding)

      const u1 = result.find(r => r.unitId === 'u1')!
      const u2 = result.find(r => r.unitId === 'u2')!

      expect(u1.baseAmount).toBe(999) // unit override
      expect(u2.baseAmount).toBe(300) // building level
    })
  })

  describe('inactive units', function () {
    it('should exclude inactive units', function () {
      const units: TUnitInfo[] = [
        makeUnit({ id: 'u1', unitNumber: '1A', isActive: true }),
        makeUnit({ id: 'u2', unitNumber: '1B', isActive: false }),
      ]
      const unitsByBuilding = new Map([['bld-1', units]])

      const assignments = [
        makeAssignment({ distributionMethod: 'fixed_per_unit', amount: 100 }),
      ]

      const result = calculateUnitCharges(assignments, units, unitsByBuilding)

      expect(result).toHaveLength(1)
      expect(result[0]!.unitId).toBe('u1')
    })
  })

  describe('inactive assignments', function () {
    it('should exclude inactive assignments', function () {
      const units: TUnitInfo[] = [
        makeUnit({ id: 'u1', unitNumber: '1A' }),
      ]
      const unitsByBuilding = new Map([['bld-1', units]])

      const assignments = [
        makeAssignment({ isActive: false, amount: 500 }),
      ]

      const result = calculateUnitCharges(assignments, units, unitsByBuilding)

      expect(result).toHaveLength(0)
    })
  })

  describe('result metadata', function () {
    it('should include unitNumber, buildingId, and aliquotPercentage', function () {
      const units: TUnitInfo[] = [
        makeUnit({
          id: 'u1',
          buildingId: 'bld-1',
          unitNumber: '3C',
          aliquotPercentage: '12.500000',
        }),
      ]
      const unitsByBuilding = new Map([['bld-1', units]])
      const assignments = [makeAssignment({ amount: 100 })]

      const result = calculateUnitCharges(assignments, units, unitsByBuilding)

      expect(result).toHaveLength(1)
      expect(result[0]!.unitNumber).toBe('3C')
      expect(result[0]!.buildingId).toBe('bld-1')
      expect(result[0]!.aliquotPercentage).toBe(12.5)
    })

    it('should return null aliquotPercentage when not set', function () {
      const units: TUnitInfo[] = [
        makeUnit({ id: 'u1', aliquotPercentage: null }),
      ]
      const unitsByBuilding = new Map([['bld-1', units]])
      const assignments = [makeAssignment({ amount: 100 })]

      const result = calculateUnitCharges(assignments, units, unitsByBuilding)

      expect(result[0]!.aliquotPercentage).toBeNull()
    })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// calculateElapsedPeriods
// ─────────────────────────────────────────────────────────────────────────────

describe('calculateElapsedPeriods', function () {
  describe('non-recurring concept', function () {
    it('should return single period with base amount', function () {
      const result = calculateElapsedPeriods(
        new Date('2025-12-01'),
        1,
        null,
        500
      )

      expect(result.periodsCount).toBe(1)
      expect(result.accumulatedAmount).toBe(500)
      expect(result.periods).toHaveLength(0) // no breakdown for non-recurring
    })
  })

  describe('monthly recurrence', function () {
    it('should count periods from first issue date to current date', function () {
      // Created Dec 1, issue day 15, monthly
      // Periods: Dec 15, Jan 15, Feb 15 (if current = Feb 20)
      const result = calculateElapsedPeriods(
        new Date('2025-12-01'),
        15,
        'monthly',
        1000,
        new Date('2026-02-20')
      )

      expect(result.periodsCount).toBe(3)
      expect(result.accumulatedAmount).toBe(3000)
      expect(result.periods).toHaveLength(3)
      expect(result.periods[0]).toEqual({ year: 2025, month: 12, amount: 1000 })
      expect(result.periods[1]).toEqual({ year: 2026, month: 1, amount: 1000 })
      expect(result.periods[2]).toEqual({ year: 2026, month: 2, amount: 1000 })
    })

    it('should start next month when created after issue day', function () {
      // Created Dec 20, issue day 15 → first period is Jan 15
      const result = calculateElapsedPeriods(
        new Date('2025-12-20'),
        15,
        'monthly',
        1000,
        new Date('2026-02-20')
      )

      expect(result.periodsCount).toBe(2)
      expect(result.periods[0]).toEqual({ year: 2026, month: 1, amount: 1000 })
      expect(result.periods[1]).toEqual({ year: 2026, month: 2, amount: 1000 })
    })

    it('should return zero periods when current date is before first issue', function () {
      // Created Dec 20, issue day 15 → first period Jan 15
      // Current date Dec 25 → no periods yet
      const result = calculateElapsedPeriods(
        new Date('2025-12-20'),
        15,
        'monthly',
        1000,
        new Date('2025-12-25')
      )

      expect(result.periodsCount).toBe(0)
      expect(result.accumulatedAmount).toBe(0)
      expect(result.periods).toHaveLength(0)
    })

    it('should handle year boundary correctly', function () {
      // Created Nov 1, issue day 28, monthly
      const result = calculateElapsedPeriods(
        new Date('2025-11-01'),
        28,
        'monthly',
        500,
        new Date('2026-02-01')
      )

      expect(result.periodsCount).toBe(3)
      expect(result.periods[0]).toEqual({ year: 2025, month: 11, amount: 500 })
      expect(result.periods[1]).toEqual({ year: 2025, month: 12, amount: 500 })
      expect(result.periods[2]).toEqual({ year: 2026, month: 1, amount: 500 })
    })
  })

  describe('quarterly recurrence', function () {
    it('should count quarterly periods', function () {
      const result = calculateElapsedPeriods(
        new Date('2025-06-01'),
        15,
        'quarterly',
        3000,
        new Date('2026-02-20')
      )

      // Periods: Jun 15, Sep 15, Dec 15 (2025), Mar 15 not yet (Feb 20)
      expect(result.periodsCount).toBe(3)
      expect(result.periods[0]).toEqual({ year: 2025, month: 6, amount: 3000 })
      expect(result.periods[1]).toEqual({ year: 2025, month: 9, amount: 3000 })
      expect(result.periods[2]).toEqual({ year: 2025, month: 12, amount: 3000 })
    })
  })

  describe('yearly recurrence', function () {
    it('should count yearly periods', function () {
      const result = calculateElapsedPeriods(
        new Date('2024-01-01'),
        15,
        'yearly',
        12000,
        new Date('2026-02-20')
      )

      // Periods: Jan 15 2024, Jan 15 2025, Jan 15 2026
      expect(result.periodsCount).toBe(3)
      expect(result.periods[0]).toEqual({ year: 2024, month: 1, amount: 12000 })
      expect(result.periods[1]).toEqual({ year: 2025, month: 1, amount: 12000 })
      expect(result.periods[2]).toEqual({ year: 2026, month: 1, amount: 12000 })
      expect(result.accumulatedAmount).toBe(36000)
    })
  })

  describe('edge cases', function () {
    it('should handle created on exact issue day', function () {
      // Created Dec 15, issue day 15 → first period is Dec 15
      const result = calculateElapsedPeriods(
        new Date('2025-12-15'),
        15,
        'monthly',
        100,
        new Date('2026-01-20')
      )

      expect(result.periodsCount).toBe(2)
      expect(result.periods[0]).toEqual({ year: 2025, month: 12, amount: 100 })
      expect(result.periods[1]).toEqual({ year: 2026, month: 1, amount: 100 })
    })

    it('should handle December creation crossing into new year', function () {
      // Created Dec 29, issue day 1 → first period Jan 1
      const result = calculateElapsedPeriods(
        new Date('2025-12-29'),
        1,
        'monthly',
        200,
        new Date('2026-02-15')
      )

      expect(result.periodsCount).toBe(2)
      expect(result.periods[0]).toEqual({ year: 2026, month: 1, amount: 200 })
      expect(result.periods[1]).toEqual({ year: 2026, month: 2, amount: 200 })
    })
  })
})
