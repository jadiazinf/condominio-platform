import { faker } from '@faker-js/faker'
import type { TQuotaGenerationRuleCreate } from '@packages/domain'

/**
 * Factory for creating quota generation rule test data.
 */
export class QuotaGenerationRuleFactory {
  /**
   * Creates fake data for a quota generation rule.
   */
  static create(overrides: Partial<TQuotaGenerationRuleCreate> = {}): TQuotaGenerationRuleCreate {
    return {
      condominiumId: faker.string.uuid(),
      buildingId: null,
      paymentConceptId: faker.string.uuid(),
      quotaFormulaId: faker.string.uuid(),
      name: faker.lorem.words(3),
      effectiveFrom: faker.date.past().toISOString().split('T')[0]!,
      effectiveTo: null,
      isActive: true,
      createdBy: faker.string.uuid(),
      ...overrides,
    }
  }

  /**
   * Creates a rule for a condominium.
   */
  static forCondominium(
    condominiumId: string,
    paymentConceptId: string,
    quotaFormulaId: string,
    overrides: Partial<TQuotaGenerationRuleCreate> = {}
  ): TQuotaGenerationRuleCreate {
    return this.create({
      condominiumId,
      buildingId: null,
      paymentConceptId,
      quotaFormulaId,
      ...overrides,
    })
  }

  /**
   * Creates a rule for a specific building.
   */
  static forBuilding(
    condominiumId: string,
    buildingId: string,
    paymentConceptId: string,
    quotaFormulaId: string,
    overrides: Partial<TQuotaGenerationRuleCreate> = {}
  ): TQuotaGenerationRuleCreate {
    return this.create({
      condominiumId,
      buildingId,
      paymentConceptId,
      quotaFormulaId,
      ...overrides,
    })
  }

  /**
   * Creates an inactive rule.
   */
  static inactive(overrides: Partial<TQuotaGenerationRuleCreate> = {}): TQuotaGenerationRuleCreate {
    return this.create({
      isActive: false,
      ...overrides,
    })
  }
}
