import { faker } from '@faker-js/faker'
import type { TUserRoleCreate } from '@packages/domain'

/**
 * Factory for creating user role assignment test data.
 */
export class UserRoleFactory {
  /**
   * Creates fake data for a user role assignment.
   */
  static create(overrides: Partial<TUserRoleCreate> = {}): TUserRoleCreate {
    return {
      userId: faker.string.uuid(),
      roleId: faker.string.uuid(),
      condominiumId: null,
      buildingId: null,
      isActive: true,
      notes: null,
      assignedBy: null,
      registeredBy: null,
      expiresAt: null,
      ...overrides,
    }
  }

  /**
   * Creates a global role assignment (no scope).
   */
  static global(
    userId: string,
    roleId: string,
    overrides: Partial<TUserRoleCreate> = {}
  ): TUserRoleCreate {
    return this.create({
      userId,
      roleId,
      condominiumId: null,
      buildingId: null,
      ...overrides,
    })
  }

  /**
   * Creates a condominium-scoped role assignment.
   */
  static forCondominium(
    userId: string,
    roleId: string,
    condominiumId: string,
    overrides: Partial<TUserRoleCreate> = {}
  ): TUserRoleCreate {
    return this.create({
      userId,
      roleId,
      condominiumId,
      buildingId: null,
      ...overrides,
    })
  }

  /**
   * Creates a building-scoped role assignment.
   */
  static forBuilding(
    userId: string,
    roleId: string,
    buildingId: string,
    overrides: Partial<TUserRoleCreate> = {}
  ): TUserRoleCreate {
    return this.create({
      userId,
      roleId,
      buildingId,
      ...overrides,
    })
  }
}
