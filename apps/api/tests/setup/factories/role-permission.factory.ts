import { faker } from '@faker-js/faker'
import type { TRolePermissionCreate } from '@packages/domain'

/**
 * Factory for creating role permission assignment test data.
 */
export class RolePermissionFactory {
  /**
   * Creates fake data for a role permission assignment.
   */
  static create(overrides: Partial<TRolePermissionCreate> = {}): TRolePermissionCreate {
    return {
      roleId: faker.string.uuid(),
      permissionId: faker.string.uuid(),
      registeredBy: null,
      ...overrides,
    }
  }

  /**
   * Creates a role permission with specific IDs.
   */
  static forRole(
    roleId: string,
    permissionId: string
  ): TRolePermissionCreate {
    return this.create({
      roleId,
      permissionId,
    })
  }
}
