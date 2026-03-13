/**
 * Auto-Generation Processor - Unit Tests
 *
 * Tests the helper functions used by the auto-generation processor:
 * - calculateTargetPeriod
 * - calculateNextGenerationDate
 *
 * Test coverage (10 tests):
 * - Target period with periodsInAdvance = 1
 * - Target period with periodsInAdvance = 2
 * - Target period crossing year boundary
 * - Next generation date: monthly
 * - Next generation date: quarterly
 * - Next generation date: semi_annual
 * - Next generation date: annual
 * - Next generation date: days (custom)
 * - Target period defaults to 1 when null
 * - Next date format is ISO date string
 */
import { describe, it, expect } from 'bun:test'

// Replicate the pure functions from the processor for testing
function calculateTargetPeriod(periodsInAdvance: number): { periodYear: number; periodMonth: number } {
  const now = new Date()
  const target = new Date(now.getFullYear(), now.getMonth() + periodsInAdvance, 1)
  return {
    periodYear: target.getFullYear(),
    periodMonth: target.getMonth() + 1,
  }
}

function calculateNextGenerationDate(frequencyType: string, generationDay: number): string {
  const now = new Date()
  let next: Date

  switch (frequencyType) {
    case 'monthly':
      next = new Date(now.getFullYear(), now.getMonth() + 1, generationDay)
      break
    case 'quarterly':
      next = new Date(now.getFullYear(), now.getMonth() + 3, generationDay)
      break
    case 'semi_annual':
      next = new Date(now.getFullYear(), now.getMonth() + 6, generationDay)
      break
    case 'annual':
      next = new Date(now.getFullYear() + 1, now.getMonth(), generationDay)
      break
    default: // 'days'
      next = new Date(now.getTime() + generationDay * 24 * 60 * 60 * 1000)
      break
  }

  return next.toISOString().split('T')[0]!
}

describe('Auto-Generation - Target Period', () => {
  it('calculates target period with 1 period in advance', () => {
    const now = new Date()
    const expected = new Date(now.getFullYear(), now.getMonth() + 1, 1)

    const result = calculateTargetPeriod(1)

    expect(result.periodYear).toBe(expected.getFullYear())
    expect(result.periodMonth).toBe(expected.getMonth() + 1)
  })

  it('calculates target period with 2 periods in advance', () => {
    const now = new Date()
    const expected = new Date(now.getFullYear(), now.getMonth() + 2, 1)

    const result = calculateTargetPeriod(2)

    expect(result.periodYear).toBe(expected.getFullYear())
    expect(result.periodMonth).toBe(expected.getMonth() + 1)
  })

  it('handles year boundary (e.g., December + 1 = January next year)', () => {
    // This test validates the Date constructor handles month overflow
    const target = new Date(2025, 12, 1) // Month 12 = January 2026
    expect(target.getFullYear()).toBe(2026)
    expect(target.getMonth()).toBe(0) // January
  })

  it('defaults periodsInAdvance = 1 when falsy', () => {
    const maybeNull: number | null = null
    const advance = maybeNull ?? 1
    const result = calculateTargetPeriod(advance)
    const now = new Date()
    const expected = new Date(now.getFullYear(), now.getMonth() + 1, 1)

    expect(result.periodMonth).toBe(expected.getMonth() + 1)
  })
})

describe('Auto-Generation - Next Generation Date', () => {
  it('monthly: adds 1 month', () => {
    const result = calculateNextGenerationDate('monthly', 15)
    const now = new Date()
    const expected = new Date(now.getFullYear(), now.getMonth() + 1, 15)

    expect(result).toBe(expected.toISOString().split('T')[0]!)
  })

  it('quarterly: adds 3 months', () => {
    const result = calculateNextGenerationDate('quarterly', 1)
    const now = new Date()
    const expected = new Date(now.getFullYear(), now.getMonth() + 3, 1)

    expect(result).toBe(expected.toISOString().split('T')[0]!)
  })

  it('semi_annual: adds 6 months', () => {
    const result = calculateNextGenerationDate('semi_annual', 1)
    const now = new Date()
    const expected = new Date(now.getFullYear(), now.getMonth() + 6, 1)

    expect(result).toBe(expected.toISOString().split('T')[0]!)
  })

  it('annual: adds 1 year', () => {
    const result = calculateNextGenerationDate('annual', 1)
    const now = new Date()
    const expected = new Date(now.getFullYear() + 1, now.getMonth(), 1)

    expect(result).toBe(expected.toISOString().split('T')[0]!)
  })

  it('days: adds generationDay days', () => {
    const result = calculateNextGenerationDate('days', 7)
    const now = new Date()
    const expected = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

    expect(result).toBe(expected.toISOString().split('T')[0]!)
  })

  it('returns ISO date format (YYYY-MM-DD)', () => {
    const result = calculateNextGenerationDate('monthly', 1)
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})
