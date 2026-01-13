import type { TQuotaFormula, TFormulaType } from '@packages/domain'
import type { QuotaFormulasRepository, UnitsRepository } from '@database/repositories'
import { type TServiceResult, success, failure } from '../base.service'

export type TCalculateFormulaAmountInput = {
  formulaId: string
  unitId: string
  additionalVariables?: Record<string, number>
}

export type TCalculateFormulaAmountOutput = {
  amount: string
  breakdown: {
    formulaType: TFormulaType
    expression?: string
    variables?: Record<string, number>
    result: number
  }
}

/**
 * Service to calculate the amount for a specific unit using a formula.
 * This is a preview/calculation service - it doesn't create any records.
 */
export class CalculateFormulaAmountService {
  constructor(
    private readonly quotaFormulasRepository: QuotaFormulasRepository,
    private readonly unitsRepository: UnitsRepository
  ) {}

  async execute(
    input: TCalculateFormulaAmountInput
  ): Promise<TServiceResult<TCalculateFormulaAmountOutput>> {
    const { formulaId, unitId, additionalVariables = {} } = input

    // 1. Get the formula
    const formula = await this.quotaFormulasRepository.getById(formulaId)
    if (!formula) {
      return failure('Formula not found', 'NOT_FOUND')
    }

    if (!formula.isActive) {
      return failure('Formula is not active', 'BAD_REQUEST')
    }

    // 2. Get the unit
    const unit = await this.unitsRepository.getById(unitId)
    if (!unit) {
      return failure('Unit not found', 'NOT_FOUND')
    }

    // 3. Calculate amount based on formula type
    let amount: number
    let variables: Record<string, number> = {}

    switch (formula.formulaType) {
      case 'fixed':
        amount = parseFloat(formula.fixedAmount || '0')
        break

      case 'expression':
        // Build variables from unit data
        variables = {
          base_rate: additionalVariables.base_rate || 0,
          aliquot_percentage: parseFloat(unit.aliquotPercentage || '0'),
          area_m2: parseFloat(unit.areaM2 || '0'),
          unit_count: 1,
          floor: unit.floor || 0,
          parking_spaces: unit.parkingSpaces || 0,
          ...additionalVariables,
        }

        const expressionResult = this.evaluateExpression(formula.expression || '', variables)
        if (!expressionResult.success) {
          return failure(`Expression evaluation failed: ${expressionResult.error}`, 'BAD_REQUEST')
        }
        amount = expressionResult.value
        break

      case 'per_unit':
        // Look up the specific amount for this unit
        const unitAmounts = formula.unitAmounts as Record<string, string> | null
        if (!unitAmounts || !unitAmounts[unitId]) {
          return failure('No amount defined for this unit in per_unit formula', 'BAD_REQUEST')
        }
        amount = parseFloat(unitAmounts[unitId])
        break

      default:
        return failure('Unknown formula type', 'INTERNAL_ERROR')
    }

    // 4. Validate the result
    if (isNaN(amount) || !isFinite(amount)) {
      return failure('Formula calculation resulted in invalid number', 'BAD_REQUEST')
    }

    if (amount < 0) {
      return failure('Formula calculation resulted in negative amount', 'BAD_REQUEST')
    }

    return success({
      amount: amount.toFixed(2),
      breakdown: {
        formulaType: formula.formulaType,
        expression: formula.expression || undefined,
        variables: Object.keys(variables).length > 0 ? variables : undefined,
        result: amount,
      },
    })
  }

  /**
   * Safely evaluates a mathematical expression with given variables.
   * Only supports basic arithmetic operations.
   */
  private evaluateExpression(
    expression: string,
    variables: Record<string, number>
  ): { success: true; value: number } | { success: false; error: string } {
    try {
      // Replace variables with their values
      let evaluableExpression = expression

      for (const [varName, varValue] of Object.entries(variables)) {
        const regex = new RegExp(`\\b${varName}\\b`, 'g')
        evaluableExpression = evaluableExpression.replace(regex, varValue.toString())
      }

      // Validate the expression contains only allowed characters
      if (!/^[\d\s+\-*/.()]+$/.test(evaluableExpression)) {
        return {
          success: false,
          error: 'Expression contains invalid characters after variable substitution',
        }
      }

      // Use Function constructor for safe evaluation (sandboxed)
      // This is safer than eval() as it doesn't have access to local scope
      const calculate = new Function(`return (${evaluableExpression})`)
      const result = calculate()

      if (typeof result !== 'number') {
        return { success: false, error: 'Expression did not evaluate to a number' }
      }

      return { success: true, value: result }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }
}
