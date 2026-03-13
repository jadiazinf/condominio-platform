import type { TFormulaType } from '../../../domain/src'
import type { QuotaFormulasRepository, UnitsRepository } from '../../../database/src/repositories'
import { type TServiceResult, success, failure } from '../base'

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

export class CalculateFormulaAmountService {
  constructor(
    private readonly quotaFormulasRepository: QuotaFormulasRepository,
    private readonly unitsRepository: UnitsRepository
  ) {}

  async execute(
    input: TCalculateFormulaAmountInput
  ): Promise<TServiceResult<TCalculateFormulaAmountOutput>> {
    const { formulaId, unitId, additionalVariables = {} } = input

    const formula = await this.quotaFormulasRepository.getById(formulaId)
    if (!formula) {
      return failure('Formula not found', 'NOT_FOUND')
    }

    if (!formula.isActive) {
      return failure('Formula is not active', 'BAD_REQUEST')
    }

    const unit = await this.unitsRepository.getById(unitId)
    if (!unit) {
      return failure('Unit not found', 'NOT_FOUND')
    }

    let amount: number
    let variables: Record<string, number> = {}

    switch (formula.formulaType) {
      case 'fixed':
        amount = parseFloat(formula.fixedAmount || '0')
        break

      case 'expression':
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

      case 'per_unit': {
        const unitAmounts = formula.unitAmounts as Record<string, string> | null
        if (!unitAmounts || !unitAmounts[unitId]) {
          return failure('No amount defined for this unit in per_unit formula', 'BAD_REQUEST')
        }
        amount = parseFloat(unitAmounts[unitId])
        break
      }

      default:
        return failure('Unknown formula type', 'INTERNAL_ERROR')
    }

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

  private evaluateExpression(
    expression: string,
    variables: Record<string, number>
  ): { success: true; value: number } | { success: false; error: string } {
    try {
      let evaluableExpression = expression

      for (const [varName, varValue] of Object.entries(variables)) {
        const regex = new RegExp(`\\b${varName}\\b`, 'g')
        evaluableExpression = evaluableExpression.replace(regex, varValue.toString())
      }

      if (!/^[\d\s+\-*/.()]+$/.test(evaluableExpression)) {
        return {
          success: false,
          error: 'Expression contains invalid characters after variable substitution',
        }
      }

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
