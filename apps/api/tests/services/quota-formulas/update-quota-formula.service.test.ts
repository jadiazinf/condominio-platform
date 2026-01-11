import { describe, it, expect, beforeEach } from 'bun:test'
import type { TQuotaFormula } from '@packages/domain'
import { UpdateQuotaFormulaService } from '@src/services/quota-formulas'

type TMockRepository = {
  getById: (id: string) => Promise<TQuotaFormula | null>
  update: (id: string, data: unknown) => Promise<TQuotaFormula | null>
}

describe('UpdateQuotaFormulaService', function () {
  let service: UpdateQuotaFormulaService
  let mockRepository: TMockRepository

  const formulaId = '550e8400-e29b-41d4-a716-446655440100'
  const condominiumId = '550e8400-e29b-41d4-a716-446655440001'
  const currencyId = '550e8400-e29b-41d4-a716-446655440002'
  const createdByUserId = '550e8400-e29b-41d4-a716-446655440003'
  const updatedByUserId = '550e8400-e29b-41d4-a716-446655440004'

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

  beforeEach(function () {
    mockRepository = {
      getById: async function (id: string) {
        if (id === formulaId) return mockFixedFormula
        return null
      },
      update: async function (_id: string, data: unknown) {
        return { ...mockFixedFormula, ...(data as object) }
      },
    }

    service = new UpdateQuotaFormulaService(mockRepository as never)
  })

  describe('execute', function () {
    it('should update formula name successfully', async function () {
      const result = await service.execute({
        formulaId,
        name: 'Updated Formula Name',
        updatedByUserId,
        updateReason: 'Renaming formula',
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.name).toBe('Updated Formula Name')
        expect(result.data.updatedBy).toBe(updatedByUserId)
        expect(result.data.updateReason).toBe('Renaming formula')
      }
    })

    it('should update fixed amount successfully', async function () {
      const result = await service.execute({
        formulaId,
        fixedAmount: '150.00',
        updatedByUserId,
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.fixedAmount).toBe('150.00')
      }
    })

    it('should deactivate a formula', async function () {
      const result = await service.execute({
        formulaId,
        isActive: false,
        updatedByUserId,
        updateReason: 'No longer needed',
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.isActive).toBe(false)
      }
    })

    it('should fail when formula does not exist', async function () {
      const result = await service.execute({
        formulaId: '550e8400-e29b-41d4-a716-446655440999',
        name: 'New Name',
        updatedByUserId,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Formula not found')
        expect(result.code).toBe('NOT_FOUND')
      }
    })

    it('should fail when changing to fixed without amount', async function () {
      // Start with an expression formula
      const expressionFormula: TQuotaFormula = {
        ...mockFixedFormula,
        formulaType: 'expression',
        fixedAmount: null,
        expression: 'base_rate * aliquot_percentage',
      }

      mockRepository.getById = async function () {
        return expressionFormula
      }

      const result = await service.execute({
        formulaId,
        formulaType: 'fixed',
        fixedAmount: null,
        updatedByUserId,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Fixed amount is required for fixed formula type')
        expect(result.code).toBe('BAD_REQUEST')
      }
    })

    it('should fail when changing to expression without expression', async function () {
      const result = await service.execute({
        formulaId,
        formulaType: 'expression',
        expression: null,
        updatedByUserId,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Expression is required for expression formula type')
        expect(result.code).toBe('BAD_REQUEST')
      }
    })

    it('should fail when changing to per_unit without unit amounts', async function () {
      const result = await service.execute({
        formulaId,
        formulaType: 'per_unit',
        unitAmounts: null,
        updatedByUserId,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Unit amounts are required for per_unit formula type')
        expect(result.code).toBe('BAD_REQUEST')
      }
    })

    it('should fail when updating with invalid expression', async function () {
      // Start with an expression formula
      const expressionFormula: TQuotaFormula = {
        ...mockFixedFormula,
        formulaType: 'expression',
        fixedAmount: null,
        expression: 'base_rate * aliquot_percentage',
      }

      mockRepository.getById = async function () {
        return expressionFormula
      }

      const result = await service.execute({
        formulaId,
        expression: 'eval("bad")',
        updatedByUserId,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Expression contains forbidden characters or keywords')
        expect(result.code).toBe('BAD_REQUEST')
      }
    })

    it('should fail when updated with negative fixed amount', async function () {
      const result = await service.execute({
        formulaId,
        fixedAmount: '-50.00',
        updatedByUserId,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Fixed amount must be a valid non-negative number')
        expect(result.code).toBe('BAD_REQUEST')
      }
    })

    it('should change formula type from fixed to expression', async function () {
      const updatedFormula: TQuotaFormula = {
        ...mockFixedFormula,
        formulaType: 'expression',
        fixedAmount: null,
        expression: 'base_rate * aliquot_percentage',
      }

      mockRepository.update = async function () {
        return updatedFormula
      }

      const result = await service.execute({
        formulaId,
        formulaType: 'expression',
        expression: 'base_rate * aliquot_percentage',
        updatedByUserId,
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.formulaType).toBe('expression')
        expect(result.data.expression).toBe('base_rate * aliquot_percentage')
      }
    })

    it('should fail when update returns null', async function () {
      mockRepository.update = async function () {
        return null
      }

      const result = await service.execute({
        formulaId,
        name: 'New Name',
        updatedByUserId,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Failed to update formula')
        expect(result.code).toBe('INTERNAL_ERROR')
      }
    })

    it('should track update reason', async function () {
      const result = await service.execute({
        formulaId,
        name: 'Updated Name',
        updatedByUserId,
        updateReason: 'Correcting formula name as per client request',
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.updateReason).toBe('Correcting formula name as per client request')
        expect(result.data.updatedBy).toBe(updatedByUserId)
      }
    })

    it('should allow updating currency', async function () {
      const newCurrencyId = '550e8400-e29b-41d4-a716-446655440005'

      mockRepository.update = async function (_id, data) {
        return { ...mockFixedFormula, ...(data as object), currencyId: newCurrencyId }
      }

      const result = await service.execute({
        formulaId,
        currencyId: newCurrencyId,
        updatedByUserId,
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.currencyId).toBe(newCurrencyId)
      }
    })
  })
})
