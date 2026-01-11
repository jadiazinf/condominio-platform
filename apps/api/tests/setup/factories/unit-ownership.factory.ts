import { faker } from '@faker-js/faker'
import type { TUnitOwnershipCreate } from '@packages/domain'

/**
 * Factory for creating unit ownership test data.
 */
export class UnitOwnershipFactory {
  /**
   * Creates fake data for a unit ownership.
   */
  static create(overrides: Partial<TUnitOwnershipCreate> = {}): TUnitOwnershipCreate {
    return {
      unitId: faker.string.uuid(),
      userId: faker.string.uuid(),
      ownershipType: 'owner',
      ownershipPercentage: '100.00',
      titleDeedNumber: null,
      titleDeedDate: null,
      startDate: faker.date.past().toISOString().split('T')[0]!,
      endDate: null,
      isActive: true,
      isPrimaryResidence: true,
      metadata: null,
      ...overrides,
    }
  }

  /**
   * Creates an owner ownership.
   */
  static owner(
    unitId: string,
    userId: string,
    overrides: Partial<TUnitOwnershipCreate> = {}
  ): TUnitOwnershipCreate {
    return this.create({
      unitId,
      userId,
      ownershipType: 'owner',
      ownershipPercentage: '100.00',
      ...overrides,
    })
  }

  /**
   * Creates a co-owner ownership.
   */
  static coOwner(
    unitId: string,
    userId: string,
    overrides: Partial<TUnitOwnershipCreate> = {}
  ): TUnitOwnershipCreate {
    return this.create({
      unitId,
      userId,
      ownershipType: 'co-owner',
      ownershipPercentage: '50.00',
      ...overrides,
    })
  }

  /**
   * Creates a tenant ownership.
   */
  static tenant(
    unitId: string,
    userId: string,
    overrides: Partial<TUnitOwnershipCreate> = {}
  ): TUnitOwnershipCreate {
    return this.create({
      unitId,
      userId,
      ownershipType: 'tenant',
      ownershipPercentage: null,
      startDate: faker.date.past().toISOString().split('T')[0]!,
      endDate: faker.date.future().toISOString().split('T')[0]!,
      ...overrides,
    })
  }
}
