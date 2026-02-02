import { eq, ne } from 'drizzle-orm'
import type { TRole, TRoleCreate, TRoleUpdate } from '@packages/domain'
import { roles } from '@database/drizzle/schema'
import type { TDrizzleClient, IRepositoryWithHardDelete } from './interfaces'
import { BaseRepository } from './base'

type TRoleRecord = typeof roles.$inferSelect

/**
 * Repository for managing role entities.
 * Uses hard delete since roles don't have isActive flag.
 */
export class RolesRepository
  extends BaseRepository<typeof roles, TRole, TRoleCreate, TRoleUpdate>
  implements IRepositoryWithHardDelete<TRole, TRoleCreate, TRoleUpdate>
{
  constructor(db: TDrizzleClient) {
    super(db, roles)
  }

  protected mapToEntity(record: unknown): TRole {
    const r = record as TRoleRecord
    return {
      id: r.id,
      name: r.name,
      description: r.description,
      isSystemRole: r.isSystemRole ?? false,
      registeredBy: r.registeredBy,
      createdAt: r.createdAt ?? new Date(),
      updatedAt: r.updatedAt ?? new Date(),
    }
  }

  protected mapToInsertValues(dto: TRoleCreate): Record<string, unknown> {
    return {
      name: dto.name,
      description: dto.description,
      isSystemRole: dto.isSystemRole,
      registeredBy: dto.registeredBy,
    }
  }

  protected mapToUpdateValues(dto: TRoleUpdate): Record<string, unknown> {
    const values: Record<string, unknown> = {}

    if (dto.name !== undefined) values.name = dto.name
    if (dto.description !== undefined) values.description = dto.description
    if (dto.isSystemRole !== undefined) values.isSystemRole = dto.isSystemRole
    if (dto.registeredBy !== undefined) values.registeredBy = dto.registeredBy

    return values
  }

  /**
   * Override listAll since roles don't have isActive.
   */
  override async listAll(): Promise<TRole[]> {
    const results = await this.db.select().from(roles)
    return results.map(record => this.mapToEntity(record))
  }

  /**
   * Override delete to use hard delete.
   */
  override async delete(id: string): Promise<boolean> {
    return this.hardDelete(id)
  }

  /**
   * Retrieves a role by name.
   */
  async getByName(name: string): Promise<TRole | null> {
    const results = await this.db.select().from(roles).where(eq(roles.name, name)).limit(1)

    if (results.length === 0) {
      return null
    }

    return this.mapToEntity(results[0])
  }

  /**
   * Retrieves all system roles.
   */
  async getSystemRoles(): Promise<TRole[]> {
    const results = await this.db.select().from(roles).where(eq(roles.isSystemRole, true))

    return results.map(record => this.mapToEntity(record))
  }

  /**
   * Retrieves roles that can be assigned to condominium users.
   * Returns all roles except SUPERADMIN.
   */
  async getAssignableRoles(): Promise<TRole[]> {
    const results = await this.db.select().from(roles).where(ne(roles.name, 'SUPERADMIN'))

    return results.map(record => this.mapToEntity(record))
  }
}
