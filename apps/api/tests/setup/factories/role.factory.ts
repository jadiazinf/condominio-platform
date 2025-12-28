import { faker } from '@faker-js/faker'
import type { TRoleCreate } from '@packages/domain'

/**
 * Factory for creating role test data.
 */
export class RoleFactory {
  /**
   * Creates fake data for a role.
   */
  static create(overrides: Partial<TRoleCreate> = {}): TRoleCreate {
    return {
      name: faker.person.jobTitle(),
      description: faker.lorem.sentence(),
      isSystemRole: false,
      registeredBy: null,
      ...overrides,
    }
  }

  /**
   * Creates fake data for a system role.
   */
  static systemRole(overrides: Partial<TRoleCreate> = {}): TRoleCreate {
    return this.create({
      isSystemRole: true,
      ...overrides,
    })
  }

  /**
   * Creates fake data for an admin role.
   */
  static admin(overrides: Partial<TRoleCreate> = {}): TRoleCreate {
    return this.create({
      name: 'Administrator',
      description: 'Full system access',
      isSystemRole: true,
      ...overrides,
    })
  }

  /**
   * Creates fake data for a manager role.
   */
  static manager(overrides: Partial<TRoleCreate> = {}): TRoleCreate {
    return this.create({
      name: 'Manager',
      description: 'Management access',
      isSystemRole: false,
      ...overrides,
    })
  }

  /**
   * Creates fake data for an owner role.
   */
  static owner(overrides: Partial<TRoleCreate> = {}): TRoleCreate {
    return this.create({
      name: 'Owner',
      description: 'Unit owner access',
      isSystemRole: false,
      ...overrides,
    })
  }
}
