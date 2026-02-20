import { faker } from '@faker-js/faker'
import type { TAccessRequestCreate } from '@packages/domain'

export class AccessRequestFactory {
  static create(overrides: Partial<TAccessRequestCreate> = {}): TAccessRequestCreate {
    return {
      accessCodeId: faker.string.uuid(),
      unitId: faker.string.uuid(),
      ownershipType: 'tenant',
      ...overrides,
    }
  }

  static forUnit(
    accessCodeId: string,
    unitId: string,
    ownershipType: 'owner' | 'tenant' | 'family_member' | 'authorized' = 'tenant',
    overrides: Partial<TAccessRequestCreate> = {}
  ): TAccessRequestCreate {
    return this.create({
      accessCodeId,
      unitId,
      ownershipType,
      ...overrides,
    })
  }
}
