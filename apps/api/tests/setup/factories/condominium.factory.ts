import { faker } from '@faker-js/faker'
import type { TCondominiumCreate } from '@packages/domain'

/**
 * Factory for creating condominium test data.
 */
export class CondominiumFactory {
  /**
   * Creates fake data for a condominium.
   * Note: managementCompanyIds is required and must have at least one element.
   * Use withManagementCompanies() to create with actual management company IDs.
   */
  static create(overrides: Partial<TCondominiumCreate> = {}): TCondominiumCreate {
    return {
      name: `Residencias ${faker.location.street()}`,
      code: faker.string.alphanumeric(6).toUpperCase(),
      // Many-to-many: array of management company IDs (required, min 1)
      managementCompanyIds: [],
      address: faker.location.streetAddress(),
      locationId: null,
      email: faker.internet.email(),
      phone: faker.phone.number(),
      phoneCountryCode: '+58',
      defaultCurrencyId: null,
      isActive: true,
      metadata: null,
      createdBy: null,
      ...overrides,
    }
  }

  /**
   * Creates fake data with management companies (many-to-many).
   */
  static withManagementCompanies(
    managementCompanyIds: string[],
    overrides: Partial<TCondominiumCreate> = {}
  ): TCondominiumCreate {
    return this.create({
      managementCompanyIds,
      ...overrides,
    })
  }

  /**
   * Creates fake data with a single management company.
   * @deprecated Use withManagementCompanies() for many-to-many relationship
   */
  static withManagementCompany(
    managementCompanyId: string,
    overrides: Partial<TCondominiumCreate> = {}
  ): TCondominiumCreate {
    return this.create({
      managementCompanyIds: [managementCompanyId],
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
