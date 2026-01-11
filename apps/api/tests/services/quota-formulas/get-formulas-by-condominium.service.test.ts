import { describe, it, expect, beforeEach } from 'bun:test'
import type { TQuotaFormula } from '@packages/domain'
import { GetFormulasByCondominiumService } from '@src/services/quota-formulas'

type TMockRepository = {
  getByCondominiumId: (condominiumId: string, includeInactive: boolean) => Promise<TQuotaFormula[]>
}

describe('GetFormulasByCondominiumService', function () {
  let service: GetFormulasByCondominiumService
  let mockRepository: TMockRepository

  const condominiumId = '550e8400-e29b-41d4-a716-446655440001'
  const currencyId = '550e8400-e29b-41d4-a716-446655440002'
  const createdByUserId = '550e8400-e29b-41d4-a716-446655440003'

  const mockFormulas: TQuotaFormula[] = [
    {
      id: '550e8400-e29b-41d4-a716-446655440100',
      condominiumId,
      name: 'Fixed Monthly Fee',
      description: 'A fixed monthly fee',
      formulaType: 'fixed',
      fixedAmount: '100.00',
      expression: null,
      variables: null,
      unitAmounts: null,
      currencyId,
      isActive: true,
      createdBy: createdByUserId,
      createdAt: new Date(),
      updatedBy: null,
      updatedAt: new Date(),
      updateReason: null,
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440101',
      condominiumId,
      name: 'Expression Formula',
      description: 'A calculated formula',
      formulaType: 'expression',
      fixedAmount: null,
      expression: 'base_rate * aliquot_percentage',
      variables: { base_rate: 1000 },
      unitAmounts: null,
      currencyId,
      isActive: true,
      createdBy: createdByUserId,
      createdAt: new Date(),
      updatedBy: null,
      updatedAt: new Date(),
      updateReason: null,
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440102',
      condominiumId,
      name: 'Inactive Formula',
      description: 'An inactive formula',
      formulaType: 'fixed',
      fixedAmount: '50.00',
      expression: null,
      variables: null,
      unitAmounts: null,
      currencyId,
      isActive: false,
      createdBy: createdByUserId,
      createdAt: new Date(),
      updatedBy: null,
      updatedAt: new Date(),
      updateReason: null,
    },
  ]

  beforeEach(function () {
    mockRepository = {
      getByCondominiumId: async function (requestedCondominiumId: string, includeInactive: boolean) {
        const filtered = mockFormulas.filter(function (f) {
          return f.condominiumId === requestedCondominiumId
        })

        if (includeInactive) {
          return filtered
        }

        return filtered.filter(function (f) {
          return f.isActive
        })
      },
    }

    service = new GetFormulasByCondominiumService(mockRepository as never)
  })

  describe('execute', function () {
    it('should return only active formulas by default', async function () {
      const result = await service.execute({ condominiumId })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(2)
        expect(result.data.every((f) => f.isActive)).toBe(true)
      }
    })

    it('should return all formulas including inactive when requested', async function () {
      const result = await service.execute({
        condominiumId,
        includeInactive: true,
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(3)
        expect(result.data.some((f) => !f.isActive)).toBe(true)
      }
    })

    it('should return empty array when condominium has no formulas', async function () {
      const result = await service.execute({
        condominiumId: '550e8400-e29b-41d4-a716-446655440999',
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(0)
      }
    })

    it('should return formulas of different types', async function () {
      const result = await service.execute({ condominiumId })

      expect(result.success).toBe(true)
      if (result.success) {
        const types = result.data.map((f) => f.formulaType)
        expect(types).toContain('fixed')
        expect(types).toContain('expression')
      }
    })

    it('should return formulas belonging to the specified condominium only', async function () {
      const result = await service.execute({ condominiumId })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.every((f) => f.condominiumId === condominiumId)).toBe(true)
      }
    })

    it('should include inactive when includeInactive is explicitly set to true', async function () {
      const result = await service.execute({
        condominiumId,
        includeInactive: true,
      })

      expect(result.success).toBe(true)
      if (result.success) {
        const inactiveFormulas = result.data.filter((f) => !f.isActive)
        expect(inactiveFormulas).toHaveLength(1)
        expect(inactiveFormulas[0]?.name).toBe('Inactive Formula')
      }
    })

    it('should exclude inactive when includeInactive is explicitly false', async function () {
      const result = await service.execute({
        condominiumId,
        includeInactive: false,
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(2)
        expect(result.data.every((f) => f.isActive)).toBe(true)
      }
    })
  })
})
