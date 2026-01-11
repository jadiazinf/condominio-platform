import { describe, it, expect, beforeEach } from 'bun:test'
import type { TQuotaFormula, TUnit } from '@packages/domain'
import { CalculateFormulaAmountService } from '@src/services/quota-formulas'

type TMockQuotaFormulasRepository = {
  getById: (id: string) => Promise<TQuotaFormula | null>
}

type TMockUnitsRepository = {
  getById: (id: string) => Promise<TUnit | null>
}

describe('CalculateFormulaAmountService', function () {
  let service: CalculateFormulaAmountService
  let mockQuotaFormulasRepository: TMockQuotaFormulasRepository
  let mockUnitsRepository: TMockUnitsRepository

  const formulaId = '550e8400-e29b-41d4-a716-446655440100'
  const unitId = '550e8400-e29b-41d4-a716-446655440200'
  const condominiumId = '550e8400-e29b-41d4-a716-446655440001'
  const currencyId = '550e8400-e29b-41d4-a716-446655440002'
  const buildingId = '550e8400-e29b-41d4-a716-446655440300'
  const createdByUserId = '550e8400-e29b-41d4-a716-446655440003'

  const mockFixedFormula: TQuotaFormula = {
    id: formulaId,
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
  }

  const mockUnit: TUnit = {
    id: unitId,
    buildingId,
    unitNumber: 'A-101',
    floor: 10,
    areaM2: '85.50',
    bedrooms: 3,
    bathrooms: 2,
    parkingSpaces: 2,
    parkingIdentifiers: ['P-101', 'P-102'],
    storageIdentifier: 'S-101',
    aliquotPercentage: '1.25',
    isActive: true,
    metadata: null,
    createdBy: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  beforeEach(function () {
    mockQuotaFormulasRepository = {
      getById: async function (id: string) {
        if (id === formulaId) return mockFixedFormula
        return null
      },
    }

    mockUnitsRepository = {
      getById: async function (id: string) {
        if (id === unitId) return mockUnit
        return null
      },
    }

    service = new CalculateFormulaAmountService(
      mockQuotaFormulasRepository as never,
      mockUnitsRepository as never
    )
  })

  describe('execute with fixed formula', function () {
    it('should calculate fixed amount correctly', async function () {
      const result = await service.execute({
        formulaId,
        unitId,
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.amount).toBe('100.00')
        expect(result.data.breakdown.formulaType).toBe('fixed')
        expect(result.data.breakdown.result).toBe(100)
      }
    })
  })

  describe('execute with expression formula', function () {
    const expressionFormulaId = '550e8400-e29b-41d4-a716-446655440101'

    beforeEach(function () {
      const expressionFormula: TQuotaFormula = {
        ...mockFixedFormula,
        id: expressionFormulaId,
        formulaType: 'expression',
        fixedAmount: null,
        expression: 'base_rate * aliquot_percentage / 100',
        variables: null,
      }

      mockQuotaFormulasRepository.getById = async function (id: string) {
        if (id === expressionFormulaId) return expressionFormula
        if (id === formulaId) return mockFixedFormula
        return null
      }
    })

    it('should calculate expression with unit variables', async function () {
      const result = await service.execute({
        formulaId: expressionFormulaId,
        unitId,
        additionalVariables: { base_rate: 10000 },
      })

      expect(result.success).toBe(true)
      if (result.success) {
        // base_rate (10000) * aliquot_percentage (1.25) / 100 = 125
        expect(result.data.amount).toBe('125.00')
        expect(result.data.breakdown.formulaType).toBe('expression')
        expect(result.data.breakdown.variables?.base_rate).toBe(10000)
        expect(result.data.breakdown.variables?.aliquot_percentage).toBe(1.25)
      }
    })

    it('should calculate expression with area', async function () {
      const areaFormula: TQuotaFormula = {
        ...mockFixedFormula,
        id: expressionFormulaId,
        formulaType: 'expression',
        fixedAmount: null,
        expression: 'area_m2 * 2',
        variables: null,
      }

      mockQuotaFormulasRepository.getById = async function (id: string) {
        if (id === expressionFormulaId) return areaFormula
        return null
      }

      const result = await service.execute({
        formulaId: expressionFormulaId,
        unitId,
      })

      expect(result.success).toBe(true)
      if (result.success) {
        // area_m2 (85.50) * 2 = 171
        expect(result.data.amount).toBe('171.00')
      }
    })

    it('should calculate expression with floor', async function () {
      const floorFormula: TQuotaFormula = {
        ...mockFixedFormula,
        id: expressionFormulaId,
        formulaType: 'expression',
        fixedAmount: null,
        expression: 'floor * 5 + 100',
        variables: null,
      }

      mockQuotaFormulasRepository.getById = async function (id: string) {
        if (id === expressionFormulaId) return floorFormula
        return null
      }

      const result = await service.execute({
        formulaId: expressionFormulaId,
        unitId,
      })

      expect(result.success).toBe(true)
      if (result.success) {
        // floor (10) * 5 + 100 = 150
        expect(result.data.amount).toBe('150.00')
      }
    })

    it('should calculate expression with parking spaces', async function () {
      const parkingFormula: TQuotaFormula = {
        ...mockFixedFormula,
        id: expressionFormulaId,
        formulaType: 'expression',
        fixedAmount: null,
        expression: 'parking_spaces * 25',
        variables: null,
      }

      mockQuotaFormulasRepository.getById = async function (id: string) {
        if (id === expressionFormulaId) return parkingFormula
        return null
      }

      const result = await service.execute({
        formulaId: expressionFormulaId,
        unitId,
      })

      expect(result.success).toBe(true)
      if (result.success) {
        // parking_spaces (2) * 25 = 50
        expect(result.data.amount).toBe('50.00')
      }
    })

    it('should calculate complex expression correctly', async function () {
      const complexFormula: TQuotaFormula = {
        ...mockFixedFormula,
        id: expressionFormulaId,
        formulaType: 'expression',
        fixedAmount: null,
        expression: '(base_rate * aliquot_percentage / 100) + (floor * 2) + (parking_spaces * 10)',
        variables: null,
      }

      mockQuotaFormulasRepository.getById = async function (id: string) {
        if (id === expressionFormulaId) return complexFormula
        return null
      }

      const result = await service.execute({
        formulaId: expressionFormulaId,
        unitId,
        additionalVariables: { base_rate: 10000 },
      })

      expect(result.success).toBe(true)
      if (result.success) {
        // (10000 * 1.25 / 100) + (10 * 2) + (2 * 10) = 125 + 20 + 20 = 165
        expect(result.data.amount).toBe('165.00')
      }
    })
  })

  describe('execute with per_unit formula', function () {
    const perUnitFormulaId = '550e8400-e29b-41d4-a716-446655440102'

    beforeEach(function () {
      const perUnitFormula: TQuotaFormula = {
        ...mockFixedFormula,
        id: perUnitFormulaId,
        formulaType: 'per_unit',
        fixedAmount: null,
        unitAmounts: {
          [unitId]: '250.00',
          'other-unit': '300.00',
        },
      }

      mockQuotaFormulasRepository.getById = async function (id: string) {
        if (id === perUnitFormulaId) return perUnitFormula
        if (id === formulaId) return mockFixedFormula
        return null
      }
    })

    it('should calculate per_unit amount for specified unit', async function () {
      const result = await service.execute({
        formulaId: perUnitFormulaId,
        unitId,
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.amount).toBe('250.00')
        expect(result.data.breakdown.formulaType).toBe('per_unit')
      }
    })

    it('should fail when unit not defined in per_unit formula', async function () {
      const unknownUnitId = '550e8400-e29b-41d4-a716-446655440999'

      mockUnitsRepository.getById = async function (id: string) {
        if (id === unitId) return mockUnit
        if (id === unknownUnitId) {
          return { ...mockUnit, id: unknownUnitId }
        }
        return null
      }

      const result = await service.execute({
        formulaId: perUnitFormulaId,
        unitId: unknownUnitId,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('No amount defined for this unit in per_unit formula')
        expect(result.code).toBe('BAD_REQUEST')
      }
    })
  })

  describe('error cases', function () {
    it('should fail when formula does not exist', async function () {
      const result = await service.execute({
        formulaId: '550e8400-e29b-41d4-a716-446655440999',
        unitId,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Formula not found')
        expect(result.code).toBe('NOT_FOUND')
      }
    })

    it('should fail when formula is inactive', async function () {
      const inactiveFormula: TQuotaFormula = {
        ...mockFixedFormula,
        isActive: false,
      }

      mockQuotaFormulasRepository.getById = async function () {
        return inactiveFormula
      }

      const result = await service.execute({
        formulaId,
        unitId,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Formula is not active')
        expect(result.code).toBe('BAD_REQUEST')
      }
    })

    it('should fail when unit does not exist', async function () {
      const result = await service.execute({
        formulaId,
        unitId: '550e8400-e29b-41d4-a716-446655440999',
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Unit not found')
        expect(result.code).toBe('NOT_FOUND')
      }
    })

    it('should fail when expression results in NaN', async function () {
      const invalidFormula: TQuotaFormula = {
        ...mockFixedFormula,
        formulaType: 'expression',
        fixedAmount: null,
        expression: 'base_rate / 0 * 0', // NaN
      }

      mockQuotaFormulasRepository.getById = async function () {
        return invalidFormula
      }

      const result = await service.execute({
        formulaId,
        unitId,
        additionalVariables: { base_rate: 0 },
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Formula calculation resulted in invalid number')
      }
    })

    it('should fail when expression results in negative amount', async function () {
      const negativeFormula: TQuotaFormula = {
        ...mockFixedFormula,
        formulaType: 'expression',
        fixedAmount: null,
        expression: 'base_rate - 1000',
      }

      mockQuotaFormulasRepository.getById = async function () {
        return negativeFormula
      }

      const result = await service.execute({
        formulaId,
        unitId,
        additionalVariables: { base_rate: 100 },
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Formula calculation resulted in negative amount')
        expect(result.code).toBe('BAD_REQUEST')
      }
    })

    it('should fail when expression contains invalid characters after substitution', async function () {
      const malformedFormula: TQuotaFormula = {
        ...mockFixedFormula,
        formulaType: 'expression',
        fixedAmount: null,
        expression: 'base_rate abc 100', // Invalid after substitution
      }

      mockQuotaFormulasRepository.getById = async function () {
        return malformedFormula
      }

      const result = await service.execute({
        formulaId,
        unitId,
        additionalVariables: { base_rate: 100 },
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toContain('Expression evaluation failed')
      }
    })
  })

  describe('breakdown information', function () {
    it('should include expression and variables in breakdown for expression formula', async function () {
      const expressionFormula: TQuotaFormula = {
        ...mockFixedFormula,
        formulaType: 'expression',
        fixedAmount: null,
        expression: 'base_rate + floor',
      }

      mockQuotaFormulasRepository.getById = async function () {
        return expressionFormula
      }

      const result = await service.execute({
        formulaId,
        unitId,
        additionalVariables: { base_rate: 100 },
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.breakdown.expression).toBe('base_rate + floor')
        expect(result.data.breakdown.variables).toBeDefined()
        expect(result.data.breakdown.variables?.base_rate).toBe(100)
        expect(result.data.breakdown.variables?.floor).toBe(10)
      }
    })

    it('should not include variables for fixed formula', async function () {
      const result = await service.execute({
        formulaId,
        unitId,
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.breakdown.formulaType).toBe('fixed')
        expect(result.data.breakdown.variables).toBeUndefined()
        expect(result.data.breakdown.expression).toBeUndefined()
      }
    })
  })
})
