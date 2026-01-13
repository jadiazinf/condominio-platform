import { faker } from '@faker-js/faker'
import type { TInterestConfigurationCreate } from '@packages/domain'

/**
 * Factory for creating interest configuration test data.
 */
export class InterestConfigurationFactory {
  /**
   * Creates fake data for an interest configuration.
   */
  static create(
    overrides: Partial<TInterestConfigurationCreate> = {}
  ): TInterestConfigurationCreate {
    return {
      condominiumId: faker.string.uuid(),
      buildingId: null,
      paymentConceptId: null,
      currencyId: null,
      name: faker.lorem.words(3),
      description: faker.lorem.sentence(),
      interestType: 'simple',
      interestRate: '10.00',
      fixedAmount: null,
      calculationPeriod: 'monthly',
      gracePeriodDays: 5,
      effectiveFrom: faker.date.past().toISOString().split('T')[0]!,
      effectiveTo: null,
      isActive: true,
      metadata: null,
      createdBy: null,
      ...overrides,
    }
  }

  /**
   * Creates a simple interest configuration.
   */
  static simple(
    overrides: Partial<TInterestConfigurationCreate> = {}
  ): TInterestConfigurationCreate {
    return this.create({
      interestType: 'simple',
      interestRate: '10.00',
      ...overrides,
    })
  }

  /**
   * Creates a compound interest configuration.
   */
  static compound(
    overrides: Partial<TInterestConfigurationCreate> = {}
  ): TInterestConfigurationCreate {
    return this.create({
      interestType: 'compound',
      interestRate: '12.00',
      ...overrides,
    })
  }

  /**
   * Creates a fixed amount interest configuration.
   */
  static fixedAmount(
    overrides: Partial<TInterestConfigurationCreate> = {}
  ): TInterestConfigurationCreate {
    return this.create({
      interestType: 'fixed_amount',
      interestRate: '25.00',
      ...overrides,
    })
  }
}
