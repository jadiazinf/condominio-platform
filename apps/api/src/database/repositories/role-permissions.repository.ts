import { and, eq } from 'drizzle-orm'
import type {
  TRolePermission,
  TRolePermissionCreate,
  TRolePermissionUpdate,
} from '@packages/domain'
import { rolePermissions } from '@database/drizzle/schema'
import type { TDrizzleClient, IRepositoryWithHardDelete } from './interfaces'
import { BaseRepository } from './base'

type TRolePermissionRecord = typeof rolePermissions.$inferSelect

/**
 * Repository for managing role-permission junction entities.
 * Uses hard delete since this is a junction table.
 */
export class RolePermissionsRepository
  extends BaseRepository<
    typeof rolePermissions,
    TRolePermission,
    TRolePermissionCreate,
    TRolePermissionUpdate
  >
  implements
    IRepositoryWithHardDelete<TRolePermission, TRolePermissionCreate, TRolePermissionUpdate>
{
  constructor(db: TDrizzleClient) {
    super(db, rolePermissions)
  }

  protected mapToEntity(record: unknown): TRolePermission {
    const r = record as TRolePermissionRecord
    return {
      id: r.id,
      roleId: r.roleId,
      permissionId: r.permissionId,
      registeredBy: r.registeredBy,
      createdAt: r.createdAt ?? new Date(),
    }
  }

  protected mapToInsertValues(dto: TRolePermissionCreate): Record<string, unknown> {
    return {
      roleId: dto.roleId,
      permissionId: dto.permissionId,
      registeredBy: dto.registeredBy,
    }
  }

  protected mapToUpdateValues(dto: TRolePermissionUpdate): Record<string, unknown> {
    const values: Record<string, unknown> = {}

    if (dto.roleId !== undefined) values.roleId = dto.roleId
    if (dto.permissionId !== undefined) values.permissionId = dto.permissionId
    if (dto.registeredBy !== undefined) values.registeredBy = dto.registeredBy

    return values
  }

  /**
   * Override listAll since role-permissions don't have isActive.
   */
  override async listAll(): Promise<TRolePermission[]> {
    const results = await this.db.select().from(rolePermissions)
    return results.map(record => this.mapToEntity(record))
  }

  /**
   * Override delete to use hard delete.
   */
  override async delete(id: string): Promise<boolean> {
    return this.hardDelete(id)
  }

  /**
   * Retrieves all permissions for a role.
   */
  async getByRoleId(roleId: string): Promise<TRolePermission[]> {
    const results = await this.db
      .select()
      .from(rolePermissions)
      .where(eq(rolePermissions.roleId, roleId))

    return results.map(record => this.mapToEntity(record))
  }

  /**
   * Retrieves all roles that have a specific permission.
   */
  async getByPermissionId(permissionId: string): Promise<TRolePermission[]> {
    const results = await this.db
      .select()
      .from(rolePermissions)
      .where(eq(rolePermissions.permissionId, permissionId))

    return results.map(record => this.mapToEntity(record))
  }

  /**
   * Checks if a role has a specific permission.
   */
  async exists(roleId: string, permissionId: string): Promise<boolean> {
    const results = await this.db
      .select()
      .from(rolePermissions)
      .where(
        and(eq(rolePermissions.roleId, roleId), eq(rolePermissions.permissionId, permissionId))
      )
      .limit(1)

    return results.length > 0
  }

  /**
   * Removes a permission from a role.
   */
  async removeByRoleAndPermission(roleId: string, permissionId: string): Promise<boolean> {
    const results = await this.db
      .delete(rolePermissions)
      .where(
        and(eq(rolePermissions.roleId, roleId), eq(rolePermissions.permissionId, permissionId))
      )
      .returning()

    return results.length > 0
  }
}
