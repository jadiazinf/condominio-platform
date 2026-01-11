import type { TQuotaFormula, TQuotaFormulaUpdate, TFormulaType } from '@packages/domain'
import type { QuotaFormulasRepository } from '@database/repositories'
import { type TServiceResult, success, failure } from '../base.service'

export type TUpdateQuotaFormulaInput = {
  formulaId: string
  name?: string
  description?: string | null
  formulaType?: TFormulaType
  fixedAmount?: string | null
  expression?: string | null
  variables?: Record<string, unknown> | null
  unitAmounts?: Record<string, unknown> | null
  currencyId?: string
  isActive?: boolean
  updatedByUserId: string
  updateReason?: string | null
}

/**
 * Service to update an existing quota formula.
 * Maintains traceability of who updated and why.
 */
export class UpdateQuotaFormulaService {
  constructor(private readonly quotaFormulasRepository: QuotaFormulasRepository) {}

  async execute(input: TUpdateQuotaFormulaInput): Promise<TServiceResult<TQuotaFormula>> {
    const { formulaId, updatedByUserId, updateReason, ...updateFields } = input

    // 1. Get existing formula
    const existingFormula = await this.quotaFormulasRepository.getById(formulaId)
    if (!existingFormula) {
      return failure('Formula not found', 'NOT_FOUND')
    }

    // 2. Determine the effective formula type (new or existing)
    const effectiveFormulaType = updateFields.formulaType ?? existingFormula.formulaType

    // 3. Validate formula configuration if type or values changed
    if (updateFields.formulaType || updateFields.fixedAmount !== undefined ||
        updateFields.expression !== undefined || updateFields.unitAmounts !== undefined) {

      const fixedAmount = updateFields.fixedAmount ?? existingFormula.fixedAmount
      const expression = updateFields.expression ?? existingFormula.expression
      const unitAmounts = updateFields.unitAmounts ?? existingFormula.unitAmounts

      const validationResult = this.validateFormulaConfig(
        effectiveFormulaType,
        fixedAmount,
        expression,
        unitAmounts
      )
      if (!validationResult.valid) {
        return failure(validationResult.error, 'BAD_REQUEST')
      }

      // Validate expression if it's an expression type
      if (effectiveFormulaType === 'expression' && expression) {
        const expressionValidation = this.validateExpression(expression)
        if (!expressionValidation.valid) {
          return failure(expressionValidation.error, 'BAD_REQUEST')
        }
      }
    }

    // 4. Build update data
    const updateData: TQuotaFormulaUpdate = {
      updatedBy: updatedByUserId,
      updateReason: updateReason ?? null,
    }

    if (updateFields.name !== undefined) updateData.name = updateFields.name
    if (updateFields.description !== undefined) updateData.description = updateFields.description
    if (updateFields.formulaType !== undefined) updateData.formulaType = updateFields.formulaType
    if (updateFields.fixedAmount !== undefined) updateData.fixedAmount = updateFields.fixedAmount
    if (updateFields.expression !== undefined) updateData.expression = updateFields.expression
    if (updateFields.variables !== undefined) updateData.variables = updateFields.variables
    if (updateFields.unitAmounts !== undefined) updateData.unitAmounts = updateFields.unitAmounts
    if (updateFields.currencyId !== undefined) updateData.currencyId = updateFields.currencyId
    if (updateFields.isActive !== undefined) updateData.isActive = updateFields.isActive

    // 5. Update the formula
    const updatedFormula = await this.quotaFormulasRepository.update(formulaId, updateData)
    if (!updatedFormula) {
      return failure('Failed to update formula', 'INTERNAL_ERROR')
    }

    return success(updatedFormula)
  }

  private validateFormulaConfig(
    formulaType: TFormulaType,
    fixedAmount?: string | null,
    expression?: string | null,
    unitAmounts?: Record<string, unknown> | null
  ): { valid: boolean; error: string } {
    switch (formulaType) {
      case 'fixed':
        if (!fixedAmount) {
          return { valid: false, error: 'Fixed amount is required for fixed formula type' }
        }
        const amount = parseFloat(fixedAmount)
        if (isNaN(amount) || amount < 0) {
          return { valid: false, error: 'Fixed amount must be a valid non-negative number' }
        }
        break

      case 'expression':
        if (!expression) {
          return { valid: false, error: 'Expression is required for expression formula type' }
        }
        break

      case 'per_unit':
        if (!unitAmounts || Object.keys(unitAmounts).length === 0) {
          return { valid: false, error: 'Unit amounts are required for per_unit formula type' }
        }
        break
    }

    return { valid: true, error: '' }
  }

  private validateExpression(expression: string): { valid: boolean; error: string } {
    const allowedVariables = [
      'base_rate',
      'aliquot_percentage',
      'area_m2',
      'unit_count',
      'floor',
      'parking_spaces',
    ]

    const dangerousPatterns = [
      /function/i,
      /eval/i,
      /exec/i,
      /import/i,
      /require/i,
      /process/i,
      /global/i,
      /window/i,
      /document/i,
      /fetch/i,
      /XMLHttpRequest/i,
      /\[/,
      /\]/,
      /;/,
      /=/,
    ]

    for (const pattern of dangerousPatterns) {
      if (pattern.test(expression)) {
        return { valid: false, error: 'Expression contains forbidden characters or keywords' }
      }
    }

    const variablePattern = /[a-zA-Z_][a-zA-Z0-9_]*/g
    const usedVariables = expression.match(variablePattern) || []

    for (const variable of usedVariables) {
      if (!allowedVariables.includes(variable)) {
        return {
          valid: false,
          error: `Unknown variable: ${variable}. Allowed variables: ${allowedVariables.join(', ')}`,
        }
      }
    }

    let depth = 0
    for (const char of expression) {
      if (char === '(') depth++
      if (char === ')') depth--
      if (depth < 0) {
        return { valid: false, error: 'Unbalanced parentheses in expression' }
      }
    }
    if (depth !== 0) {
      return { valid: false, error: 'Unbalanced parentheses in expression' }
    }

    return { valid: true, error: '' }
  }
}
