import { faker } from '@faker-js/faker'
import type { TUnitCreate } from '@packages/domain'

/**
 * Factory for creating unit test data.
 */
export class UnitFactory {
  /**
   * Creates fake data for a unit.
   */
  static create(buildingId: string, overrides: Partial<TUnitCreate> = {}): TUnitCreate {
    const floor = faker.number.int({ min: 1, max: 30 })

    return {
      buildingId,
      unitNumber: `${floor}${faker.string.alpha({ length: 1, casing: 'upper' })}`,
      floor,
      areaM2: faker.number.float({ min: 50, max: 300, fractionDigits: 2 }).toString(),
      bedrooms: faker.number.int({ min: 1, max: 5 }),
      bathrooms: faker.number.int({ min: 1, max: 4 }),
      parkingSpaces: faker.number.int({ min: 0, max: 3 }),
      parkingIdentifiers: [],
      storageIdentifier: faker.string.alphanumeric(4).toUpperCase(),
      aliquotPercentage: faker.number.float({ min: 0.1, max: 5, fractionDigits: 6 }).toString(),
      isActive: true,
      metadata: null,
      createdBy: null,
      ...overrides,
    }
  }

  /**
   * Creates fake data for a unit with parking.
   */
  static withParking(
    buildingId: string,
    parkingCount: number,
    overrides: Partial<TUnitCreate> = {}
  ): TUnitCreate {
    const unitNumber = overrides.unitNumber ?? `${faker.number.int({ min: 1, max: 30 })}A`
    const parkingIdentifiers = Array.from(
      { length: parkingCount },
      (_, i) => `P-${unitNumber}-${i + 1}`
    )

    return this.create(buildingId, {
      parkingSpaces: parkingCount,
      parkingIdentifiers,
      unitNumber,
      ...overrides,
    })
  }

  /**
   * Creates fake data for a unit with storage.
   */
  static withStorage(
    buildingId: string,
    storageId: string,
    overrides: Partial<TUnitCreate> = {}
  ): TUnitCreate {
    return this.create(buildingId, {
      storageIdentifier: storageId,
      ...overrides,
    })
  }

  /**
   * Creates fake data for an inactive unit.
   */
  static inactive(buildingId: string, overrides: Partial<TUnitCreate> = {}): TUnitCreate {
    return this.create(buildingId, {
      isActive: false,
      ...overrides,
    })
  }

  /**
   * Creates fake data for a studio apartment.
   */
  static studio(buildingId: string, overrides: Partial<TUnitCreate> = {}): TUnitCreate {
    return this.create(buildingId, {
      bedrooms: 0,
      bathrooms: 1,
      areaM2: faker.number.float({ min: 25, max: 45, fractionDigits: 2 }).toString(),
      ...overrides,
    })
  }

  /**
   * Creates fake data for a penthouse.
   */
  static penthouse(buildingId: string, overrides: Partial<TUnitCreate> = {}): TUnitCreate {
    return this.create(buildingId, {
      bedrooms: 4,
      bathrooms: 4,
      areaM2: faker.number.float({ min: 200, max: 400, fractionDigits: 2 }).toString(),
      parkingSpaces: 3,
      ...overrides,
    })
  }
}
