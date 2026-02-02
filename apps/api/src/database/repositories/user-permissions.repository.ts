import { and, eq } from 'drizzle-orm'
import type {
  TUserPermission,
  TUserPermissionCreate,
  TUserPermissionUpdate,
  TPermission,
} from '@packages/domain'
import { userPermissions, permissions } from '@database/drizzle/schema'
import type { TDrizzleClient, IRepositoryWithHardDelete } from './interfaces'
import { BaseRepository } from './base'

type TUserPermissionRecord = typeof userPermissions.$inferSelect

/**
 * Permission with enabled status for a user
 */
export interface TUserPermissionWithDetails {
  id: string
  permissionId: string
  permissionName: string
  module: string
  action: string
  description: string | null
  isEnabled: boolean
}

/**
 * Repository for managing user-permission junction entities.
 * Allows assigning permissions directly to users (e.g., superadmins).
 */
export class UserPermissionsRepository
  extends BaseRepository<
    typeof userPermissions,
    TUserPermission,
    TUserPermissionCreate,
    TUserPermissionUpdate
  >
  implements
    IRepositoryWithHardDelete<TUserPermission, TUserPermissionCreate, TUserPermissionUpdate>
{
  constructor(db: TDrizzleClient) {
    super(db, userPermissions)
  }

  protected mapToEntity(record: unknown): TUserPermission {
    const r = record as TUserPermissionRecord
    return {
      id: r.id,
      userId: r.userId,
      permissionId: r.permissionId,
      isEnabled: r.isEnabled ?? true,
      assignedBy: r.assignedBy,
      createdAt: r.createdAt ?? new Date(),
      updatedAt: r.updatedAt ?? new Date(),
    }
  }

  protected mapToInsertValues(dto: TUserPermissionCreate): Record<string, unknown> {
    return {
      userId: dto.userId,
      permissionId: dto.permissionId,
      isEnabled: dto.isEnabled,
      assignedBy: dto.assignedBy,
    }
  }

  protected mapToUpdateValues(dto: TUserPermissionUpdate): Record<string, unknown> {
    const values: Record<string, unknown> = {}

    if (dto.userId !== undefined) values.userId = dto.userId
    if (dto.permissionId !== undefined) values.permissionId = dto.permissionId
    if (dto.isEnabled !== undefined) values.isEnabled = dto.isEnabled
    if (dto.assignedBy !== undefined) values.assignedBy = dto.assignedBy
    values.updatedAt = new Date()

    return values
  }

  /**
   * Override listAll since user-permissions don't have soft delete.
   */
  override async listAll(): Promise<TUserPermission[]> {
    const results = await this.db.select().from(userPermissions)
    return results.map(record => this.mapToEntity(record))
  }

  /**
   * Override delete to use hard delete.
   */
  override async delete(id: string): Promise<boolean> {
    return this.hardDelete(id)
  }

  /**
   * Retrieves all permissions for a user.
   */
  async getByUserId(userId: string): Promise<TUserPermission[]> {
    const results = await this.db
      .select()
      .from(userPermissions)
      .where(eq(userPermissions.userId, userId))

    return results.map(record => this.mapToEntity(record))
  }

  /**
   * Retrieves all permissions for a user with permission details.
   */
  async getByUserIdWithDetails(userId: string): Promise<TUserPermissionWithDetails[]> {
    const results = await this.db
      .select({
        id: userPermissions.id,
        permissionId: userPermissions.permissionId,
        permissionName: permissions.name,
        module: permissions.module,
        action: permissions.action,
        description: permissions.description,
        isEnabled: userPermissions.isEnabled,
      })
      .from(userPermissions)
      .innerJoin(permissions, eq(userPermissions.permissionId, permissions.id))
      .where(eq(userPermissions.userId, userId))

    return results.map(r => ({
      id: r.id,
      permissionId: r.permissionId,
      permissionName: r.permissionName,
      module: r.module,
      action: r.action,
      description: r.description,
      isEnabled: r.isEnabled ?? true,
    }))
  }

  /**
   * Gets a specific user permission.
   */
  async getByUserAndPermission(userId: string, permissionId: string): Promise<TUserPermission | null> {
    const results = await this.db
      .select()
      .from(userPermissions)
      .where(
        and(eq(userPermissions.userId, userId), eq(userPermissions.permissionId, permissionId))
      )
      .limit(1)

    if (results.length === 0) return null
    return this.mapToEntity(results[0])
  }

  /**
   * Checks if a user has a specific permission assigned.
   */
  async exists(userId: string, permissionId: string): Promise<boolean> {
    const results = await this.db
      .select()
      .from(userPermissions)
      .where(
        and(eq(userPermissions.userId, userId), eq(userPermissions.permissionId, permissionId))
      )
      .limit(1)

    return results.length > 0
  }

  /**
   * Checks if a user has a specific permission enabled.
   */
  async hasPermissionEnabled(userId: string, permissionId: string): Promise<boolean> {
    const results = await this.db
      .select()
      .from(userPermissions)
      .where(
        and(
          eq(userPermissions.userId, userId),
          eq(userPermissions.permissionId, permissionId),
          eq(userPermissions.isEnabled, true)
        )
      )
      .limit(1)

    return results.length > 0
  }

  /**
   * Toggles the enabled status of a user permission.
   */
  async togglePermission(
    userId: string,
    permissionId: string,
    isEnabled: boolean,
    assignedBy?: string
  ): Promise<TUserPermission | null> {
    // Check if permission assignment exists
    const existing = await this.getByUserAndPermission(userId, permissionId)

    if (existing) {
      // Update existing
      const results = await this.db
        .update(userPermissions)
        .set({
          isEnabled,
          assignedBy: assignedBy ?? existing.assignedBy,
          updatedAt: new Date(),
        })
        .where(eq(userPermissions.id, existing.id))
        .returning()

      if (results.length === 0) return null
      return this.mapToEntity(results[0])
    } else {
      // Create new
      const results = await this.db
        .insert(userPermissions)
        .values({
          userId,
          permissionId,
          isEnabled,
          assignedBy,
        })
        .returning()

      if (results.length === 0) return null
      return this.mapToEntity(results[0])
    }
  }

  /**
   * Initialize user permissions from a role.
   * This copies all permissions from a role to a user with isEnabled = true.
   */
  async initializeFromRole(
    userId: string,
    roleId: string,
    assignedBy?: string
  ): Promise<TUserPermission[]> {
    // Get all permissions for the role
    const { rolePermissions: rolePermsTable } = await import('@database/drizzle/schema')

    const rolePerms = await this.db
      .select({ permissionId: rolePermsTable.permissionId })
      .from(rolePermsTable)
      .where(eq(rolePermsTable.roleId, roleId))

    const created: TUserPermission[] = []

    for (const rolePerm of rolePerms) {
      // Check if already exists
      const existing = await this.getByUserAndPermission(userId, rolePerm.permissionId)
      if (!existing) {
        const result = await this.db
          .insert(userPermissions)
          .values({
            userId,
            permissionId: rolePerm.permissionId,
            isEnabled: true,
            assignedBy,
          })
          .returning()

        if (result[0]) {
          created.push(this.mapToEntity(result[0]))
        }
      }
    }

    return created
  }

  /**
   * Removes all permissions for a user.
   */
  async removeAllByUser(userId: string): Promise<number> {
    const results = await this.db
      .delete(userPermissions)
      .where(eq(userPermissions.userId, userId))
      .returning()

    return results.length
  }
}
