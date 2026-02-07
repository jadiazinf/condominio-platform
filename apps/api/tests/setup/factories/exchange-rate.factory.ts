import { faker } from '@faker-js/faker'
import type { TExchangeRateCreate } from '@packages/domain'

/**
 * Factory for creating exchange rate test data.
 */
export class ExchangeRateFactory {
  /**
   * Creates fake data for an exchange rate.
   */
  static create(overrides: Partial<TExchangeRateCreate> = {}): TExchangeRateCreate {
    return {
      fromCurrencyId: faker.string.uuid(),
      toCurrencyId: faker.string.uuid(),
      rate: faker.number.float({ min: 0.5, max: 100, fractionDigits: 8 }).toString(),
      effectiveDate: faker.date.recent().toISOString().split('T')[0]!,
      source: faker.helpers.arrayElement(['BCV', 'Manual', 'API', 'Bank']),
      isActive: true,
      createdBy: null,
      registeredBy: null,
      ...overrides,
    }
  }

  /**
   * Creates USD to VES exchange rate.
   */
  static usdToVes(
    fromCurrencyId: string,
    toCurrencyId: string,
    overrides: Partial<TExchangeRateCreate> = {}
  ): TExchangeRateCreate {
    return this.create({
      fromCurrencyId,
      toCurrencyId,
      rate: '50.25',
      source: 'BCV',
      ...overrides,
    })
  }
}
