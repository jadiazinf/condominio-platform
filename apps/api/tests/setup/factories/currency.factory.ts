import { faker } from '@faker-js/faker'
import type { TCurrencyCreate } from '@packages/domain'

/**
 * Factory for creating currency test data.
 */
export class CurrencyFactory {
  /**
   * Creates fake data for a currency.
   */
  static create(overrides: Partial<TCurrencyCreate> = {}): TCurrencyCreate {
    return {
      code: faker.finance.currencyCode(),
      name: faker.finance.currencyName(),
      symbol: faker.finance.currencySymbol(),
      isBaseCurrency: false,
      isActive: true,
      decimals: 2,
      registeredBy: null,
      ...overrides,
    }
  }

  /**
   * Creates fake data for USD currency.
   */
  static usd(overrides: Partial<TCurrencyCreate> = {}): TCurrencyCreate {
    return this.create({
      code: 'USD',
      name: 'US Dollar',
      symbol: '$',
      ...overrides,
    })
  }

  /**
   * Creates fake data for EUR currency.
   */
  static eur(overrides: Partial<TCurrencyCreate> = {}): TCurrencyCreate {
    return this.create({
      code: 'EUR',
      name: 'Euro',
      symbol: '€',
      ...overrides,
    })
  }

  /**
   * Creates fake data for a base currency.
   */
  static baseCurrency(overrides: Partial<TCurrencyCreate> = {}): TCurrencyCreate {
    return this.create({
      isBaseCurrency: true,
      ...overrides,
    })
  }

  /**
   * Creates fake data for an inactive currency.
   */
  static inactive(overrides: Partial<TCurrencyCreate> = {}): TCurrencyCreate {
    return this.create({
      isActive: false,
      ...overrides,
    })
  }
}
