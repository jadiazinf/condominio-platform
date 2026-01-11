import type { TQuotaFormula, TQuotaFormulaCreate, TFormulaType } from '@packages/domain'
import type { QuotaFormulasRepository, CondominiumsRepository } from '@database/repositories'
import { type TServiceResult, success, failure } from '../base.service'

export type TCreateQuotaFormulaInput = {
  condominiumId: string
  name: string
  description?: string | null
  formulaType: TFormulaType
  fixedAmount?: string | null
  expression?: string | null
  variables?: Record<string, unknown> | null
  unitAmounts?: Record<string, unknown> | null
  currencyId: string
  createdByUserId: string
}

/**
 * Service to create a new quota formula.
 * Validates the formula configuration based on its type.
 */
export class CreateQuotaFormulaService {
  constructor(
    private readonly quotaFormulasRepository: QuotaFormulasRepository,
    private readonly condominiumsRepository: CondominiumsRepository
  ) {}

  async execute(input: TCreateQuotaFormulaInput): Promise<TServiceResult<TQuotaFormula>> {
    const {
      condominiumId,
      name,
      description,
      formulaType,
      fixedAmount,
      expression,
      variables,
      unitAmounts,
      currencyId,
      createdByUserId,
    } = input

    // 1. Validate condominium exists
    const condominium = await this.condominiumsRepository.getById(condominiumId)
    if (!condominium) {
      return failure('Condominium not found', 'NOT_FOUND')
    }

    // 2. Validate formula configuration based on type
    const validationResult = this.validateFormulaConfig(
      formulaType,
      fixedAmount,
      expression,
      unitAmounts
    )
    if (!validationResult.valid) {
      return failure(validationResult.error, 'BAD_REQUEST')
    }

    // 3. Validate expression if provided (security check)
    if (formulaType === 'expression' && expression) {
      const expressionValidation = this.validateExpression(expression)
      if (!expressionValidation.valid) {
        return failure(expressionValidation.error, 'BAD_REQUEST')
      }
    }

    // 4. Create the formula
    const formulaData: TQuotaFormulaCreate = {
      condominiumId,
      name,
      description: description ?? null,
      formulaType,
      fixedAmount: formulaType === 'fixed' ? (fixedAmount ?? null) : null,
      expression: formulaType === 'expression' ? (expression ?? null) : null,
      variables: formulaType === 'expression' ? (variables ?? null) : null,
      unitAmounts: formulaType === 'per_unit' ? (unitAmounts ?? null) : null,
      currencyId,
      isActive: true,
      createdBy: createdByUserId,
    }

    const formula = await this.quotaFormulasRepository.create(formulaData)

    return success(formula)
  }

  /**
   * Validates the formula configuration based on its type.
   */
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

  /**
   * Validates a formula expression for security and correctness.
   * Only allows safe mathematical operations and predefined variables.
   */
  private validateExpression(expression: string): { valid: boolean; error: string } {
    // Allowed variables
    const allowedVariables = [
      'base_rate',
      'aliquot_percentage',
      'area_m2',
      'unit_count',
      'floor',
      'parking_spaces',
    ]

    // Allowed operators and functions
    const allowedPattern =
      /^[\d\s+\-*/().]+$|^[\w\s+\-*/().]+$/
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

    // Check for dangerous patterns
    for (const pattern of dangerousPatterns) {
      if (pattern.test(expression)) {
        return { valid: false, error: 'Expression contains forbidden characters or keywords' }
      }
    }

    // Extract variables from expression
    const variablePattern = /[a-zA-Z_][a-zA-Z0-9_]*/g
    const usedVariables = expression.match(variablePattern) || []

    // Check if all used variables are allowed
    for (const variable of usedVariables) {
      if (!allowedVariables.includes(variable)) {
        return {
          valid: false,
          error: `Unknown variable: ${variable}. Allowed variables: ${allowedVariables.join(', ')}`,
        }
      }
    }

    // Basic syntax validation (parentheses matching)
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
