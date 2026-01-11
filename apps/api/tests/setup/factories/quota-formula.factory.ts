import { faker } from '@faker-js/faker'
import type { TQuotaFormulaCreate } from '@packages/domain'

/**
 * Factory for creating quota formula test data.
 */
export class QuotaFormulaFactory {
  /**
   * Creates fake data for a quota formula.
   */
  static create(overrides: Partial<TQuotaFormulaCreate> = {}): TQuotaFormulaCreate {
    return {
      condominiumId: faker.string.uuid(),
      name: faker.lorem.words(3),
      description: faker.lorem.sentence(),
      formulaType: 'fixed',
      fixedAmount: '100.00',
      expression: null,
      variables: null,
      unitAmounts: null,
      currencyId: faker.string.uuid(),
      isActive: true,
      createdBy: faker.string.uuid(),
      ...overrides,
    }
  }

  /**
   * Creates a fixed amount formula.
   */
  static fixed(
    amount: string,
    overrides: Partial<TQuotaFormulaCreate> = {}
  ): TQuotaFormulaCreate {
    return this.create({
      formulaType: 'fixed',
      fixedAmount: amount,
      expression: null,
      unitAmounts: null,
      ...overrides,
    })
  }

  /**
   * Creates an expression-based formula.
   */
  static expression(
    expression: string,
    overrides: Partial<TQuotaFormulaCreate> = {}
  ): TQuotaFormulaCreate {
    return this.create({
      formulaType: 'expression',
      fixedAmount: null,
      expression,
      variables: { base_rate: 100 },
      unitAmounts: null,
      ...overrides,
    })
  }

  /**
   * Creates a per-unit formula.
   */
  static perUnit(
    unitAmounts: Record<string, string>,
    overrides: Partial<TQuotaFormulaCreate> = {}
  ): TQuotaFormulaCreate {
    return this.create({
      formulaType: 'per_unit',
      fixedAmount: null,
      expression: null,
      unitAmounts,
      ...overrides,
    })
  }
}
