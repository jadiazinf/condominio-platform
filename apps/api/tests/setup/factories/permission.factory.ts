import { faker } from '@faker-js/faker'
import type { TPermissionCreate } from '@packages/domain'

const MODULES = [
  'condominiums',
  'buildings',
  'units',
  'payments',
  'quotas',
  'expenses',
  'users',
  'documents',
] as const
const ACTIONS = ['create', 'read', 'read_own', 'update', 'delete', 'approve'] as const

/**
 * Factory for creating permission test data.
 */
export class PermissionFactory {
  /**
   * Creates fake data for a permission.
   */
  static create(overrides: Partial<TPermissionCreate> = {}): TPermissionCreate {
    const module = faker.helpers.arrayElement(MODULES)
    const action = faker.helpers.arrayElement(ACTIONS)

    return {
      name: `${module}.${action}_${faker.string.alphanumeric(4)}`,
      description: faker.lorem.sentence(),
      module,
      action,
      registeredBy: null,
      ...overrides,
    }
  }

  /**
   * Creates fake data for a permission with specific module and action.
   */
  static forModuleAction(
    module: (typeof MODULES)[number],
    action: (typeof ACTIONS)[number],
    overrides: Partial<TPermissionCreate> = {}
  ): TPermissionCreate {
    return this.create({
      name: `${module}.${action}`,
      module,
      action,
      ...overrides,
    })
  }

  /**
   * Creates fake data for a users module permission.
   */
  static users(
    action: (typeof ACTIONS)[number],
    overrides: Partial<TPermissionCreate> = {}
  ): TPermissionCreate {
    return this.forModuleAction('users', action, overrides)
  }

  /**
   * Creates fake data for a payments module permission.
   */
  static payments(
    action: (typeof ACTIONS)[number],
    overrides: Partial<TPermissionCreate> = {}
  ): TPermissionCreate {
    return this.forModuleAction('payments', action, overrides)
  }

  /**
   * Creates fake data for a buildings module permission.
   */
  static buildings(
    action: (typeof ACTIONS)[number],
    overrides: Partial<TPermissionCreate> = {}
  ): TPermissionCreate {
    return this.forModuleAction('buildings', action, overrides)
  }
}
