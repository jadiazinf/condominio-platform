import { eq, and, desc } from 'drizzle-orm'
import type {
  TManagementCompanyMember,
  TManagementCompanyMemberCreate,
  TManagementCompanyMemberUpdate,
  TMemberPermissions,
  TMemberRole,
} from '@packages/domain'
import { managementCompanyMembers } from '@database/drizzle/schema'
import type { TDrizzleClient, IRepository } from './interfaces'
import { BaseRepository } from './base'

type TMemberRecord = typeof managementCompanyMembers.$inferSelect

/**
 * Repository for managing company member entities.
 * Handles members with roles and permissions.
 */
export class ManagementCompanyMembersRepository
  extends BaseRepository<
    typeof managementCompanyMembers,
    TManagementCompanyMember,
    TManagementCompanyMemberCreate,
    TManagementCompanyMemberUpdate
  >
  implements IRepository<TManagementCompanyMember, TManagementCompanyMemberCreate, TManagementCompanyMemberUpdate>
{
  constructor(db: TDrizzleClient) {
    super(db, managementCompanyMembers)
  }

  protected mapToEntity(record: unknown): TManagementCompanyMember {
    const r = record as TMemberRecord
    return {
      id: r.id,
      managementCompanyId: r.managementCompanyId,
      userId: r.userId,
      roleName: r.roleName,
      permissions: r.permissions as TMemberPermissions | null,
      isPrimaryAdmin: r.isPrimaryAdmin ?? false,
      joinedAt: r.joinedAt ?? new Date(),
      invitedAt: r.invitedAt,
      invitedBy: r.invitedBy,
      isActive: r.isActive ?? true,
      deactivatedAt: r.deactivatedAt,
      deactivatedBy: r.deactivatedBy,
      createdAt: r.createdAt ?? new Date(),
      updatedAt: r.updatedAt ?? new Date(),
    }
  }

  protected mapToInsertValues(dto: TManagementCompanyMemberCreate): Record<string, unknown> {
    return {
      managementCompanyId: dto.managementCompanyId,
      userId: dto.userId,
      roleName: dto.roleName,
      permissions: dto.permissions,
      isPrimaryAdmin: dto.isPrimaryAdmin,
      joinedAt: dto.joinedAt,
      invitedAt: dto.invitedAt,
      invitedBy: dto.invitedBy,
      isActive: dto.isActive,
      deactivatedAt: dto.deactivatedAt,
      deactivatedBy: dto.deactivatedBy,
    }
  }

  protected mapToUpdateValues(dto: TManagementCompanyMemberUpdate): Record<string, unknown> {
    const values: Record<string, unknown> = {}

    if (dto.managementCompanyId !== undefined) values.managementCompanyId = dto.managementCompanyId
    if (dto.userId !== undefined) values.userId = dto.userId
    if (dto.roleName !== undefined) values.roleName = dto.roleName
    if (dto.permissions !== undefined) values.permissions = dto.permissions
    if (dto.isPrimaryAdmin !== undefined) values.isPrimaryAdmin = dto.isPrimaryAdmin
    if (dto.joinedAt !== undefined) values.joinedAt = dto.joinedAt
    if (dto.invitedAt !== undefined) values.invitedAt = dto.invitedAt
    if (dto.invitedBy !== undefined) values.invitedBy = dto.invitedBy
    if (dto.isActive !== undefined) values.isActive = dto.isActive
    if (dto.deactivatedAt !== undefined) values.deactivatedAt = dto.deactivatedAt
    if (dto.deactivatedBy !== undefined) values.deactivatedBy = dto.deactivatedBy

    return values
  }

  /**
   * Get all members by management company ID (active only by default)
   */
  async listByCompanyId(companyId: string, includeInactive = false): Promise<TManagementCompanyMember[]> {
    const conditions = [eq(managementCompanyMembers.managementCompanyId, companyId)]

    if (!includeInactive) {
      conditions.push(eq(managementCompanyMembers.isActive, true))
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined

    const results = await this.db
      .select()
      .from(managementCompanyMembers)
      .where(whereClause)
      .orderBy(desc(managementCompanyMembers.joinedAt))

    return results.map(record => this.mapToEntity(record))
  }

  /**
   * Get a member by company ID and user ID
   */
  async getByCompanyAndUser(companyId: string, userId: string): Promise<TManagementCompanyMember | null> {
    const results = await this.db
      .select()
      .from(managementCompanyMembers)
      .where(
        and(
          eq(managementCompanyMembers.managementCompanyId, companyId),
          eq(managementCompanyMembers.userId, userId)
        )
      )
      .limit(1)

    if (results.length === 0) {
      return null
    }

    return this.mapToEntity(results[0])
  }

  /**
   * Get the primary admin of a management company
   */
  async getPrimaryAdmin(companyId: string): Promise<TManagementCompanyMember | null> {
    const results = await this.db
      .select()
      .from(managementCompanyMembers)
      .where(
        and(
          eq(managementCompanyMembers.managementCompanyId, companyId),
          eq(managementCompanyMembers.isPrimaryAdmin, true),
          eq(managementCompanyMembers.isActive, true)
        )
      )
      .limit(1)

    if (results.length === 0) {
      return null
    }

    return this.mapToEntity(results[0])
  }

  /**
   * Add a new member to a management company
   */
  async addMember(
    companyId: string,
    userId: string,
    role: TMemberRole,
    isPrimary: boolean,
    permissions: TMemberPermissions | null
  ): Promise<TManagementCompanyMember> {
    const dto: TManagementCompanyMemberCreate = {
      managementCompanyId: companyId,
      userId,
      roleName: role,
      isPrimaryAdmin: isPrimary,
      permissions,
      isActive: true,
      joinedAt: new Date(),
      invitedAt: null,
      invitedBy: null,
      deactivatedAt: null,
      deactivatedBy: null,
    }

    return this.create(dto)
  }

  /**
   * Remove a member (soft delete by setting isActive to false)
   */
  async removeMember(id: string, deactivatedBy: string): Promise<TManagementCompanyMember | null> {
    const results = await this.db
      .update(managementCompanyMembers)
      .set({
        isActive: false,
        deactivatedAt: new Date(),
        deactivatedBy,
        updatedAt: new Date(),
      })
      .where(eq(managementCompanyMembers.id, id))
      .returning()

    if (results.length === 0) {
      return null
    }

    return this.mapToEntity(results[0])
  }

  /**
   * Update member role
   */
  async updateRole(id: string, role: TMemberRole): Promise<TManagementCompanyMember | null> {
    const results = await this.db
      .update(managementCompanyMembers)
      .set({
        roleName: role,
        updatedAt: new Date(),
      })
      .where(eq(managementCompanyMembers.id, id))
      .returning()

    if (results.length === 0) {
      return null
    }

    return this.mapToEntity(results[0])
  }

  /**
   * Update member permissions
   */
  async updatePermissions(id: string, permissions: TMemberPermissions): Promise<TManagementCompanyMember | null> {
    const results = await this.db
      .update(managementCompanyMembers)
      .set({
        permissions,
        updatedAt: new Date(),
      })
      .where(eq(managementCompanyMembers.id, id))
      .returning()

    if (results.length === 0) {
      return null
    }

    return this.mapToEntity(results[0])
  }
}
