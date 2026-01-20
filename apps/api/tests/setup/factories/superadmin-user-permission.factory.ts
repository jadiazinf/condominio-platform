import { faker } from '@faker-js/faker'
import type { TSuperadminUserPermissionCreate } from '@packages/domain'

/**
 * Factory for creating superadmin user permission test data.
 */
export class SuperadminUserPermissionFactory {
  /**
   * Creates fake data for a superadmin user permission.
   */
  static create(
    overrides: Partial<TSuperadminUserPermissionCreate> = {}
  ): TSuperadminUserPermissionCreate {
    return {
      superadminUserId: faker.string.uuid(),
      permissionId: faker.string.uuid(),
      createdBy: null,
      ...overrides,
    }
  }
}
