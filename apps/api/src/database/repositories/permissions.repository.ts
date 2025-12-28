import { and, eq } from 'drizzle-orm'
import type { TPermission, TPermissionCreate, TPermissionUpdate } from '@packages/domain'
import { permissions } from '@database/drizzle/schema'
import type { TDrizzleClient, IRepositoryWithHardDelete } from './interfaces'
import { BaseRepository } from './base'

type TPermissionRecord = typeof permissions.$inferSelect

/**
 * Repository for managing permission entities.
 * Uses hard delete since permissions don't have isActive flag.
 */
export class PermissionsRepository
  extends BaseRepository<typeof permissions, TPermission, TPermissionCreate, TPermissionUpdate>
  implements IRepositoryWithHardDelete<TPermission, TPermissionCreate, TPermissionUpdate>
{
  constructor(db: TDrizzleClient) {
    super(db, permissions)
  }

  protected mapToEntity(record: unknown): TPermission {
    const r = record as TPermissionRecord
    return {
      id: r.id,
      name: r.name,
      description: r.description,
      module: r.module as TPermission['module'],
      action: r.action as TPermission['action'],
      registeredBy: r.registeredBy,
      createdAt: r.createdAt ?? new Date(),
      updatedAt: r.updatedAt ?? new Date(),
    }
  }

  protected mapToInsertValues(dto: TPermissionCreate): Record<string, unknown> {
    return {
      name: dto.name,
      description: dto.description,
      module: dto.module,
      action: dto.action,
      registeredBy: dto.registeredBy,
    }
  }

  protected mapToUpdateValues(dto: TPermissionUpdate): Record<string, unknown> {
    const values: Record<string, unknown> = {}

    if (dto.name !== undefined) values.name = dto.name
    if (dto.description !== undefined) values.description = dto.description
    if (dto.module !== undefined) values.module = dto.module
    if (dto.action !== undefined) values.action = dto.action
    if (dto.registeredBy !== undefined) values.registeredBy = dto.registeredBy

    return values
  }

  /**
   * Override listAll since permissions don't have isActive.
   */
  override async listAll(): Promise<TPermission[]> {
    const results = await this.db.select().from(permissions)
    return results.map(record => this.mapToEntity(record))
  }

  /**
   * Override delete to use hard delete.
   */
  override async delete(id: string): Promise<boolean> {
    return this.hardDelete(id)
  }

  /**
   * Retrieves permissions by module.
   */
  async getByModule(module: string): Promise<TPermission[]> {
    const results = await this.db.select().from(permissions).where(eq(permissions.module, module))

    return results.map(record => this.mapToEntity(record))
  }

  /**
   * Retrieves a permission by module and action.
   */
  async getByModuleAndAction(module: string, action: string): Promise<TPermission | null> {
    const results = await this.db
      .select()
      .from(permissions)
      .where(and(eq(permissions.module, module), eq(permissions.action, action)))
      .limit(1)

    if (results.length === 0) {
      return null
    }

    return this.mapToEntity(results[0])
  }
}
