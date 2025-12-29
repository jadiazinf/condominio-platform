import { faker } from '@faker-js/faker'
import type { TLocationCreate } from '@packages/domain'

/**
 * Factory for creating location test data.
 */
export class LocationFactory {
  /**
   * Creates fake data for a location.
   */
  static create(overrides: Partial<TLocationCreate> = {}): TLocationCreate {
    return {
      name: faker.location.city(),
      locationType: 'city',
      parentId: null,
      code: faker.string.alphanumeric(5).toUpperCase(),
      isActive: true,
      metadata: null,
      registeredBy: null,
      ...overrides,
    }
  }

  /**
   * Creates fake data for a country.
   */
  static country(overrides: Partial<TLocationCreate> = {}): TLocationCreate {
    return this.create({
      name: faker.location.country(),
      locationType: 'country',
      code: faker.string.alpha({ length: 2, casing: 'upper' }),
      ...overrides,
    })
  }

  /**
   * Creates fake data for a province/state.
   */
  static province(parentId?: string, overrides: Partial<TLocationCreate> = {}): TLocationCreate {
    return this.create({
      name: faker.location.state(),
      locationType: 'province',
      parentId: parentId ?? null,
      ...overrides,
    })
  }

  /**
   * Creates fake data for a city.
   */
  static city(parentId?: string, overrides: Partial<TLocationCreate> = {}): TLocationCreate {
    return this.create({
      name: faker.location.city(),
      locationType: 'city',
      parentId: parentId ?? null,
      ...overrides,
    })
  }

  /**
   * Creates fake data for an inactive location.
   */
  static inactive(overrides: Partial<TLocationCreate> = {}): TLocationCreate {
    return this.create({
      isActive: false,
      ...overrides,
    })
  }
}
