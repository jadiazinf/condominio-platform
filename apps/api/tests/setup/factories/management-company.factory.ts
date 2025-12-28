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

    return {
      name: companyName,
      legalName: `${companyName} S.A.`,
      taxId: faker.string.alphanumeric(11).toUpperCase(),
      email: faker.internet.email(),
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
