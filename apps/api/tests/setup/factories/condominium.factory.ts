import { faker } from '@faker-js/faker'
import type { TCondominiumCreate } from '@packages/domain'

/**
 * Factory for creating condominium test data.
 */
export class CondominiumFactory {
  /**
   * Creates fake data for a condominium.
   */
  static create(overrides: Partial<TCondominiumCreate> = {}): TCondominiumCreate {
    return {
      name: `Residencias ${faker.location.street()}`,
      code: faker.string.alphanumeric(6).toUpperCase(),
      managementCompanyId: null,
      address: faker.location.streetAddress(),
      locationId: null,
      email: faker.internet.email(),
      phone: faker.phone.number(),
      defaultCurrencyId: null,
      isActive: true,
      metadata: null,
      createdBy: null,
      ...overrides,
    }
  }

  /**
   * Creates fake data with management company.
   */
  static withManagementCompany(
    managementCompanyId: string,
    overrides: Partial<TCondominiumCreate> = {}
  ): TCondominiumCreate {
    return this.create({
      managementCompanyId,
      ...overrides,
    })
  }

  /**
   * Creates fake data with default currency.
   */
  static withCurrency(
    currencyId: string,
    overrides: Partial<TCondominiumCreate> = {}
  ): TCondominiumCreate {
    return this.create({
      defaultCurrencyId: currencyId,
      ...overrides,
    })
  }

  /**
   * Creates fake data with location.
   */
  static withLocation(
    locationId: string,
    overrides: Partial<TCondominiumCreate> = {}
  ): TCondominiumCreate {
    return this.create({
      locationId,
      ...overrides,
    })
  }

  /**
   * Creates fake data for an inactive condominium.
   */
  static inactive(overrides: Partial<TCondominiumCreate> = {}): TCondominiumCreate {
    return this.create({
      isActive: false,
      ...overrides,
    })
  }
}
