import { faker } from '@faker-js/faker'
import type { TSuperadminUserCreate } from '@packages/domain'

/**
 * Factory for creating superadmin user test data.
 */
export class SuperadminUserFactory {
  /**
   * Creates fake data for a superadmin user.
   */
  static create(overrides: Partial<TSuperadminUserCreate> = {}): TSuperadminUserCreate {
    return {
      userId: faker.string.uuid(),
      notes: faker.lorem.sentence(),
      isActive: true,
      createdBy: null,
      ...overrides,
    }
  }

  /**
   * Creates fake data for an active superadmin user.
   */
  static active(overrides: Partial<TSuperadminUserCreate> = {}): TSuperadminUserCreate {
    return this.create({
      isActive: true,
      ...overrides,
    })
  }

  /**
   * Creates fake data for an inactive superadmin user.
   */
  static inactive(overrides: Partial<TSuperadminUserCreate> = {}): TSuperadminUserCreate {
    return this.create({
      isActive: false,
      notes: 'Account disabled',
      ...overrides,
    })
  }
}
