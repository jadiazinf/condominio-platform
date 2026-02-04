import { describe, it, expect, beforeEach } from 'bun:test'
import type { TQuotaFormula, TCondominium } from '@packages/domain'
import { CreateQuotaFormulaService } from '@src/services/quota-formulas'

type TMockQuotaFormulasRepository = {
  create: (data: unknown) => Promise<TQuotaFormula>
}

type TMockCondominiumsRepository = {
  getById: (id: string) => Promise<TCondominium | null>
}

describe('CreateQuotaFormulaService', function () {
  let service: CreateQuotaFormulaService
  let mockQuotaFormulasRepository: TMockQuotaFormulasRepository
  let mockCondominiumsRepository: TMockCondominiumsRepository

  const condominiumId = '550e8400-e29b-41d4-a716-446655440001'
  const currencyId = '550e8400-e29b-41d4-a716-446655440002'
  const createdByUserId = '550e8400-e29b-41d4-a716-446655440003'

  const mockCondominium: TCondominium = {
    id: condominiumId,
    code: 'CONDO-001',
    name: 'Test Condominium',
    managementCompanyId: '550e8400-e29b-41d4-a716-446655440010',
    locationId: null,
    address: null,
    email: null,
    phone: null,
    phoneCountryCode: null,
    defaultCurrencyId: null,
    isActive: true,
    metadata: null,
    createdBy: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  const mockFixedFormula: TQuotaFormula = {
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
  }

  beforeEach(function () {
    mockCondominiumsRepository = {
      getById: async function (id: string) {
        if (id === condominiumId) return mockCondominium
        return null
      },
    }

    mockQuotaFormulasRepository = {
      create: async function () {
        return mockFixedFormula
      },
    }

    service = new CreateQuotaFormulaService(
      mockQuotaFormulasRepository as never,
      mockCondominiumsRepository as never
    )
  })

  describe('execute', function () {
    it('should create a fixed formula successfully', async function () {
      const result = await service.execute({
        condominiumId,
        name: 'Fixed Monthly Fee',
        description: 'A fixed monthly fee',
        formulaType: 'fixed',
        fixedAmount: '100.00',
        currencyId,
        createdByUserId,
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.formulaType).toBe('fixed')
        expect(result.data.fixedAmount).toBe('100.00')
        expect(result.data.condominiumId).toBe(condominiumId)
      }
    })

    it('should create an expression formula successfully', async function () {
      const expressionFormula: TQuotaFormula = {
        ...mockFixedFormula,
        formulaType: 'expression',
        fixedAmount: null,
        expression: 'base_rate * aliquot_percentage',
        variables: { base_rate: 1000 },
      }

      mockQuotaFormulasRepository.create = async function () {
        return expressionFormula
      }

      const result = await service.execute({
        condominiumId,
        name: 'Expression Formula',
        formulaType: 'expression',
        expression: 'base_rate * aliquot_percentage',
        variables: { base_rate: 1000 },
        currencyId,
        createdByUserId,
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.formulaType).toBe('expression')
        expect(result.data.expression).toBe('base_rate * aliquot_percentage')
      }
    })

    it('should create a per_unit formula successfully', async function () {
      const perUnitFormula: TQuotaFormula = {
        ...mockFixedFormula,
        formulaType: 'per_unit',
        fixedAmount: null,
        unitAmounts: { 'unit-1': '100', 'unit-2': '150' },
      }

      mockQuotaFormulasRepository.create = async function () {
        return perUnitFormula
      }

      const result = await service.execute({
        condominiumId,
        name: 'Per Unit Formula',
        formulaType: 'per_unit',
        unitAmounts: { 'unit-1': '100', 'unit-2': '150' },
        currencyId,
        createdByUserId,
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.formulaType).toBe('per_unit')
        expect(result.data.unitAmounts).toEqual({ 'unit-1': '100', 'unit-2': '150' })
      }
    })

    it('should fail when condominium does not exist', async function () {
      const result = await service.execute({
        condominiumId: '550e8400-e29b-41d4-a716-446655440999',
        name: 'Test Formula',
        formulaType: 'fixed',
        fixedAmount: '100.00',
        currencyId,
        createdByUserId,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Condominium not found')
        expect(result.code).toBe('NOT_FOUND')
      }
    })

    it('should fail when fixed amount is missing for fixed formula', async function () {
      const result = await service.execute({
        condominiumId,
        name: 'Test Formula',
        formulaType: 'fixed',
        currencyId,
        createdByUserId,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Fixed amount is required for fixed formula type')
        expect(result.code).toBe('BAD_REQUEST')
      }
    })

    it('should fail when fixed amount is negative', async function () {
      const result = await service.execute({
        condominiumId,
        name: 'Test Formula',
        formulaType: 'fixed',
        fixedAmount: '-50.00',
        currencyId,
        createdByUserId,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Fixed amount must be a valid non-negative number')
        expect(result.code).toBe('BAD_REQUEST')
      }
    })

    it('should fail when expression is missing for expression formula', async function () {
      const result = await service.execute({
        condominiumId,
        name: 'Test Formula',
        formulaType: 'expression',
        currencyId,
        createdByUserId,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Expression is required for expression formula type')
        expect(result.code).toBe('BAD_REQUEST')
      }
    })

    it('should fail when unit amounts are missing for per_unit formula', async function () {
      const result = await service.execute({
        condominiumId,
        name: 'Test Formula',
        formulaType: 'per_unit',
        currencyId,
        createdByUserId,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Unit amounts are required for per_unit formula type')
        expect(result.code).toBe('BAD_REQUEST')
      }
    })

    it('should fail when expression contains dangerous patterns', async function () {
      const result = await service.execute({
        condominiumId,
        name: 'Test Formula',
        formulaType: 'expression',
        expression: 'eval("malicious")',
        currencyId,
        createdByUserId,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Expression contains forbidden characters or keywords')
        expect(result.code).toBe('BAD_REQUEST')
      }
    })

    it('should fail when expression uses unknown variables', async function () {
      const result = await service.execute({
        condominiumId,
        name: 'Test Formula',
        formulaType: 'expression',
        expression: 'unknown_var * 10',
        currencyId,
        createdByUserId,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toContain('Unknown variable: unknown_var')
        expect(result.code).toBe('BAD_REQUEST')
      }
    })

    it('should fail when expression has unbalanced parentheses', async function () {
      const result = await service.execute({
        condominiumId,
        name: 'Test Formula',
        formulaType: 'expression',
        expression: 'base_rate * (aliquot_percentage + 1',
        currencyId,
        createdByUserId,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Unbalanced parentheses in expression')
        expect(result.code).toBe('BAD_REQUEST')
      }
    })

    it('should reject expressions with function keyword', async function () {
      const result = await service.execute({
        condominiumId,
        name: 'Test Formula',
        formulaType: 'expression',
        expression: 'function() { return 1 }',
        currencyId,
        createdByUserId,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Expression contains forbidden characters or keywords')
      }
    })

    it('should reject expressions with require keyword', async function () {
      const result = await service.execute({
        condominiumId,
        name: 'Test Formula',
        formulaType: 'expression',
        expression: 'require("fs")',
        currencyId,
        createdByUserId,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Expression contains forbidden characters or keywords')
      }
    })

    it('should reject expressions with brackets', async function () {
      const result = await service.execute({
        condominiumId,
        name: 'Test Formula',
        formulaType: 'expression',
        expression: 'base_rate[0]',
        currencyId,
        createdByUserId,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Expression contains forbidden characters or keywords')
      }
    })

    it('should accept valid mathematical expression', async function () {
      const expressionFormula: TQuotaFormula = {
        ...mockFixedFormula,
        formulaType: 'expression',
        fixedAmount: null,
        expression: 'base_rate * aliquot_percentage / 100 + floor * 10',
      }

      mockQuotaFormulasRepository.create = async function () {
        return expressionFormula
      }

      const result = await service.execute({
        condominiumId,
        name: 'Complex Expression',
        formulaType: 'expression',
        expression: 'base_rate * aliquot_percentage / 100 + floor * 10',
        currencyId,
        createdByUserId,
      })

      expect(result.success).toBe(true)
    })
  })
})
