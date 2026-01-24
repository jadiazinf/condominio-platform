import { faker } from '@faker-js/faker'
import type { TManagementCompanyCreate } from '@packages/domain'

/**
 * Factory for creating management company test data.
 */
export class ManagementCompanyFactory {
  /**
   * Creates fake data for a management company.
   */
  static create(overrides: Partial<TManagementCompanyCreate> = {}): TManagementCompanyCreate {
    const companyName = faker.company.name()
    const taxIdTypes = ['J', 'G', 'V', 'E', 'P'] as const

    return {
      name: companyName,
      legalName: `${companyName} S.A.`,
      taxIdType: faker.helpers.arrayElement(taxIdTypes),
      taxIdNumber: faker.string.numeric(8) + '-' + faker.string.numeric(1),
      email: faker.internet.email(),
      phoneCountryCode: '+58',
      phone: faker.phone.number(),
      website: faker.internet.url(),
      address: faker.location.streetAddress(),
      locationId: null,
      isActive: true,
      logoUrl: faker.image.url(),
      metadata: null,
      createdBy: null,
      ...overrides,
    }
  }

  /**
   * Creates fake data with specific location.
   */
  static withLocation(
    locationId: string,
    overrides: Partial<TManagementCompanyCreate> = {}
  ): TManagementCompanyCreate {
    return this.create({
      locationId,
      ...overrides,
    })
  }

  /**
   * Creates fake data for an inactive company.
   */
  static inactive(overrides: Partial<TManagementCompanyCreate> = {}): TManagementCompanyCreate {
    return this.create({
      isActive: false,
      ...overrides,
    })
  }
}
