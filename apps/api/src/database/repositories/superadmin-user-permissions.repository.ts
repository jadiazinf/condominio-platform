import { eq, and } from 'drizzle-orm'
import type {
  TSuperadminUserPermission,
  TSuperadminUserPermissionCreate,
  TPermission,
} from '@packages/domain'
import { superadminUserPermissions, permissions } from '@database/drizzle/schema'
import type { TDrizzleClient, IRepositoryWithHardDelete } from './interfaces'
import { BaseRepository } from './base'

type TSuperadminUserPermissionRecord = typeof superadminUserPermissions.$inferSelect

export class SuperadminUserPermissionsRepository
  extends BaseRepository<
    typeof superadminUserPermissions,
    TSuperadminUserPermission,
    TSuperadminUserPermissionCreate,
    Partial<TSuperadminUserPermissionCreate>
  >
  implements IRepositoryWithHardDelete<TSuperadminUserPermission, TSuperadminUserPermissionCreate, Partial<TSuperadminUserPermissionCreate>>
{
  constructor(db: TDrizzleClient) {
    super(db, superadminUserPermissions)
  }

  protected mapToEntity(record: unknown): TSuperadminUserPermission {
    const r = record as TSuperadminUserPermissionRecord
    return {
      id: r.id,
      superadminUserId: r.superadminUserId,
      permissionId: r.permissionId,
      createdAt: r.createdAt ?? new Date(),
      createdBy: r.createdBy,
    }
  }

  protected mapToInsertValues(dto: TSuperadminUserPermissionCreate): Record<string, unknown> {
    return {
      superadminUserId: dto.superadminUserId,
      permissionId: dto.permissionId,
      createdBy: dto.createdBy,
    }
  }

  protected mapToUpdateValues(
    dto: Partial<TSuperadminUserPermissionCreate>
  ): Record<string, unknown> {
    const values: Record<string, unknown> = {}

    if (dto.superadminUserId !== undefined) values.superadminUserId = dto.superadminUserId
    if (dto.permissionId !== undefined) values.permissionId = dto.permissionId
    if (dto.createdBy !== undefined) values.createdBy = dto.createdBy

    return values
  }

  override async listAll(): Promise<TSuperadminUserPermission[]> {
    const results = await this.db.select().from(superadminUserPermissions)
    return results.map(record => this.mapToEntity(record))
  }

  override async delete(id: string): Promise<boolean> {
    return this.hardDelete(id)
  }

  async getBySuperadminUserId(superadminUserId: string): Promise<TSuperadminUserPermission[]> {
    const results = await this.db
      .select()
      .from(superadminUserPermissions)
      .where(eq(superadminUserPermissions.superadminUserId, superadminUserId))

    return results.map(record => this.mapToEntity(record))
  }

  async hasPermission(superadminUserId: string, permissionId: string): Promise<boolean> {
    const results = await this.db
      .select()
      .from(superadminUserPermissions)
      .where(
        and(
          eq(superadminUserPermissions.superadminUserId, superadminUserId),
          eq(superadminUserPermissions.permissionId, permissionId)
        )
      )
      .limit(1)

    return results.length > 0
  }

  async deleteByPermissionId(
    superadminUserId: string,
    permissionId: string
  ): Promise<boolean> {
    const results = await this.db
      .delete(superadminUserPermissions)
      .where(
        and(
          eq(superadminUserPermissions.superadminUserId, superadminUserId),
          eq(superadminUserPermissions.permissionId, permissionId)
        )
      )
      .returning()

    return results.length > 0
  }

  async getPermissionsWithDetailsBySuperadminUserId(
    superadminUserId: string
  ): Promise<TPermission[]> {
    const results = await this.db
      .select({
        id: permissions.id,
        name: permissions.name,
        description: permissions.description,
        module: permissions.module,
        action: permissions.action,
        registeredBy: permissions.registeredBy,
        createdAt: permissions.createdAt,
        updatedAt: permissions.updatedAt,
      })
      .from(superadminUserPermissions)
      .innerJoin(permissions, eq(superadminUserPermissions.permissionId, permissions.id))
      .where(eq(superadminUserPermissions.superadminUserId, superadminUserId))

    return results.map(r => ({
      id: r.id,
      name: r.name,
      description: r.description,
      module: r.module as TPermission['module'],
      action: r.action as TPermission['action'],
      registeredBy: r.registeredBy,
      createdAt: r.createdAt ?? new Date(),
      updatedAt: r.updatedAt ?? new Date(),
    }))
  }
}
