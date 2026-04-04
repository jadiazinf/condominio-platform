import { describe, it, expect } from 'bun:test'
import { executeInterestCalculation, type IInterestDeps } from '@worker/processors/billing-interest-calculation.processor'

function mockCondominium(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    name: `Condo ${id}`,
    isActive: true,
    defaultCurrencyId: 'currency-1',
    ...overrides,
  }
}

function mockInterestConfig(overrides: Record<string, unknown> = {}) {
  return {
    id: 'config-1',
    isActive: true,
    interestType: 'simple',
    interestRate: '0.01',
    gracePeriodDays: 0,
    currencyId: 'currency-1',
    ...overrides,
  }
}

function createMockDeps(
  condominiums: any[] = [],
  configs: any[] = [],
  units: any[] = []
): IInterestDeps & { interestCalls: any[] } {
  const interestCalls: any[] = []
  return {
    condominiumsRepo: { getAllActive: async () => condominiums },
    interestConfigsRepo: { getByCondominiumId: async () => configs },
    unitsRepo: {
      findByCondominium: async () => units,
    },
    interestService: {
      execute: async (input: any) => {
        interestCalls.push(input)
        return { success: true, data: { interestAmount: '5.00' } }
      },
    },
    interestCalls,
  }
}

describe('executeInterestCalculation', () => {
  // ─── Happy paths ───

  it('calculates interest for condominiums with interest config', async () => {
    const deps = createMockDeps(
      [mockCondominium('condo-1')],
      [mockInterestConfig()],
      [{ id: 'unit-1' }, { id: 'unit-2' }]
    )

    const result = await executeInterestCalculation(deps, '2026-04-01')

    expect(result.totalInterestCharges).toBe(2) // one per unit
    expect(result.totalErrors).toBe(0)
    expect(deps.interestCalls).toHaveLength(2)
  })

  it('processes multiple condominiums', async () => {
    const deps = createMockDeps(
      [mockCondominium('condo-1'), mockCondominium('condo-2')],
      [mockInterestConfig()],
      [{ id: 'unit-1' }]
    )

    const result = await executeInterestCalculation(deps, '2026-04-01')

    expect(result.totalInterestCharges).toBe(2)
    expect(result.condominiumsProcessed).toBe(2)
  })

  // ─── Filtering ───

  it('skips condominiums with interestType=none', async () => {
    const deps = createMockDeps(
      [mockCondominium('condo-1')],
      [mockInterestConfig({ interestType: 'none' })],
      [{ id: 'unit-1' }]
    )

    const result = await executeInterestCalculation(deps, '2026-04-01')

    expect(result.condominiumsProcessed).toBe(0)
    expect(deps.interestCalls).toHaveLength(0)
  })

  it('skips condominiums without active config', async () => {
    const deps = createMockDeps(
      [mockCondominium('condo-1')],
      [mockInterestConfig({ isActive: false })],
      [{ id: 'unit-1' }]
    )

    const result = await executeInterestCalculation(deps, '2026-04-01')

    expect(result.condominiumsProcessed).toBe(0)
  })

  it('skips condominiums without any config', async () => {
    const deps = createMockDeps(
      [mockCondominium('condo-1')],
      [], // no configs
      [{ id: 'unit-1' }]
    )

    const result = await executeInterestCalculation(deps, '2026-04-01')

    expect(result.condominiumsProcessed).toBe(0)
  })

  it('does not count zero interest', async () => {
    const deps = createMockDeps(
      [mockCondominium('condo-1')],
      [mockInterestConfig()],
      [{ id: 'unit-1' }]
    )
    deps.interestService.execute = async (input: any) => {
      deps.interestCalls.push(input)
      return { success: true, data: { interestAmount: '0.00' } }
    }

    const result = await executeInterestCalculation(deps, '2026-04-01')

    expect(result.totalInterestCharges).toBe(0)
    expect(deps.interestCalls).toHaveLength(1) // service was called
  })

  // ─── Error handling ───

  it('counts errors per unit and continues', async () => {
    let callCount = 0
    const deps = createMockDeps(
      [mockCondominium('condo-1')],
      [mockInterestConfig()],
      [{ id: 'unit-1' }, { id: 'unit-2' }, { id: 'unit-3' }]
    )
    deps.interestService.execute = async () => {
      callCount++
      if (callCount === 2) throw new Error('unit 2 failed')
      return { success: true, data: { interestAmount: '5.00' } }
    }

    const result = await executeInterestCalculation(deps, '2026-04-01')

    expect(result.totalInterestCharges).toBe(2)
    expect(result.totalErrors).toBe(1)
  })

  it('counts condominium-level errors and continues', async () => {
    const deps = createMockDeps(
      [mockCondominium('condo-1'), mockCondominium('condo-2')],
      [mockInterestConfig()],
      [{ id: 'unit-1' }]
    )
    let firstCall = true
    deps.unitsRepo.findByCondominium = async () => {
      if (firstCall) { firstCall = false; throw new Error('DB error') }
      return [{ id: 'unit-1' }]
    }

    const result = await executeInterestCalculation(deps, '2026-04-01')

    expect(result.totalErrors).toBe(1)
    expect(result.totalInterestCharges).toBe(1)
  })

  // ─── Edge cases ───

  it('handles no condominiums', async () => {
    const deps = createMockDeps([], [], [])

    const result = await executeInterestCalculation(deps, '2026-04-01')

    expect(result.condominiumsProcessed).toBe(0)
    expect(result.totalInterestCharges).toBe(0)
  })

  it('handles no units in condominium', async () => {
    const deps = createMockDeps(
      [mockCondominium('condo-1')],
      [mockInterestConfig()],
      []
    )

    const result = await executeInterestCalculation(deps, '2026-04-01')

    expect(result.totalInterestCharges).toBe(0)
    expect(result.totalErrors).toBe(0)
  })

  it('passes correct config and calculationDate to service', async () => {
    const deps = createMockDeps(
      [mockCondominium('condo-1')],
      [mockInterestConfig({ interestType: 'compound', interestRate: '0.05' })],
      [{ id: 'unit-1' }]
    )

    await executeInterestCalculation(deps, '2026-12-31')

    expect(deps.interestCalls[0].calculationDate).toBe('2026-12-31')
    expect(deps.interestCalls[0].condominiumId).toBe('condo-1')
    expect(deps.interestCalls[0].config.interestType).toBe('compound')
    expect(deps.interestCalls[0].config.interestRate).toBe('0.05')
  })
})
