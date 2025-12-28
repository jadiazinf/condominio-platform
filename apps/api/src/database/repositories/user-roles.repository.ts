import { and, eq, isNull } from 'drizzle-orm'
import type { TUserRole, TUserRoleCreate, TUserRoleUpdate } from '@packages/domain'
import { userRoles } from '@database/drizzle/schema'
import type { TDrizzleClient, IRepositoryWithHardDelete } from './interfaces'
import { BaseRepository } from './base'

type TUserRoleRecord = typeof userRoles.$inferSelect

/**
 * Repository for managing user-role assignment entities.
 * Uses hard delete since this is a junction table.
 */
export class UserRolesRepository
  extends BaseRepository<typeof userRoles, TUserRole, TUserRoleCreate, TUserRoleUpdate>
  implements IRepositoryWithHardDelete<TUserRole, TUserRoleCreate, TUserRoleUpdate>
{
  constructor(db: TDrizzleClient) {
    super(db, userRoles)
  }

  protected mapToEntity(record: unknown): TUserRole {
    const r = record as TUserRoleRecord
    return {
      id: r.id,
      userId: r.userId,
      roleId: r.roleId,
      condominiumId: r.condominiumId,
      buildingId: r.buildingId,
      assignedAt: r.assignedAt ?? new Date(),
      assignedBy: r.assignedBy,
      registeredBy: r.registeredBy,
      expiresAt: r.expiresAt,
    }
  }

  protected mapToInsertValues(dto: TUserRoleCreate): Record<string, unknown> {
    return {
      userId: dto.userId,
      roleId: dto.roleId,
      condominiumId: dto.condominiumId,
      buildingId: dto.buildingId,
      assignedBy: dto.assignedBy,
      registeredBy: dto.registeredBy,
      expiresAt: dto.expiresAt,
    }
  }

  protected mapToUpdateValues(dto: TUserRoleUpdate): Record<string, unknown> {
    const values: Record<string, unknown> = {}

    if (dto.userId !== undefined) values.userId = dto.userId
    if (dto.roleId !== undefined) values.roleId = dto.roleId
    if (dto.condominiumId !== undefined) values.condominiumId = dto.condominiumId
    if (dto.buildingId !== undefined) values.buildingId = dto.buildingId
    if (dto.assignedBy !== undefined) values.assignedBy = dto.assignedBy
    if (dto.registeredBy !== undefined) values.registeredBy = dto.registeredBy
    if (dto.expiresAt !== undefined) values.expiresAt = dto.expiresAt

    return values
  }

  /**
   * Override listAll since user-roles don't have isActive.
   */
  override async listAll(): Promise<TUserRole[]> {
    const results = await this.db.select().from(userRoles)
    return results.map(record => this.mapToEntity(record))
  }

  /**
   * Override delete to use hard delete.
   */
  override async delete(id: string): Promise<boolean> {
    return this.hardDelete(id)
  }

  /**
   * Retrieves all roles for a user.
   */
  async getByUserId(userId: string): Promise<TUserRole[]> {
    const results = await this.db.select().from(userRoles).where(eq(userRoles.userId, userId))

    return results.map(record => this.mapToEntity(record))
  }

  /**
   * Retrieves user roles for a specific condominium.
   */
  async getByUserAndCondominium(userId: string, condominiumId: string): Promise<TUserRole[]> {
    const results = await this.db
      .select()
      .from(userRoles)
      .where(and(eq(userRoles.userId, userId), eq(userRoles.condominiumId, condominiumId)))

    return results.map(record => this.mapToEntity(record))
  }

  /**
   * Retrieves user roles for a specific building.
   */
  async getByUserAndBuilding(userId: string, buildingId: string): Promise<TUserRole[]> {
    const results = await this.db
      .select()
      .from(userRoles)
      .where(and(eq(userRoles.userId, userId), eq(userRoles.buildingId, buildingId)))

    return results.map(record => this.mapToEntity(record))
  }

  /**
   * Retrieves global roles for a user (no condominium or building scope).
   */
  async getGlobalRolesByUser(userId: string): Promise<TUserRole[]> {
    const results = await this.db
      .select()
      .from(userRoles)
      .where(
        and(
          eq(userRoles.userId, userId),
          isNull(userRoles.condominiumId),
          isNull(userRoles.buildingId)
        )
      )

    return results.map(record => this.mapToEntity(record))
  }

  /**
   * Checks if a user has a specific role.
   */
  async userHasRole(
    userId: string,
    roleId: string,
    condominiumId?: string,
    buildingId?: string
  ): Promise<boolean> {
    const conditions = [eq(userRoles.userId, userId), eq(userRoles.roleId, roleId)]

    if (condominiumId) {
      conditions.push(eq(userRoles.condominiumId, condominiumId))
    }
    if (buildingId) {
      conditions.push(eq(userRoles.buildingId, buildingId))
    }

    const results = await this.db
      .select()
      .from(userRoles)
      .where(and(...conditions))
      .limit(1)

    return results.length > 0
  }
}
