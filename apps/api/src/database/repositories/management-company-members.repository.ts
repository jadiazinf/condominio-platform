import { eq, and, desc, or, ilike, sql } from 'drizzle-orm'
import type {
  TManagementCompanyMember,
  TManagementCompanyMemberCreate,
  TManagementCompanyMemberUpdate,
  TMemberPermissions,
  TMemberRole,
  TPaginatedResponse,
  TManagementCompanyMembersQuerySchema,
} from '@packages/domain'
import { managementCompanyMembers, users, managementCompanies, userRoles, condominiumManagementCompanies } from '@database/drizzle/schema'
import type { TDrizzleClient, IRepository } from './interfaces'
import { BaseRepository } from './base'

type TMemberRecord = typeof managementCompanyMembers.$inferSelect

export type TMemberUserInfo = {
  id: string
  email: string
  displayName: string | null
  firstName: string | null
  lastName: string | null
  photoUrl: string | null
}

export type TManagementCompanyMemberWithUser = Omit<TManagementCompanyMember, 'user' | 'managementCompany' | 'invitedByUser' | 'deactivatedByUser'> & {
  user: TMemberUserInfo | null
}

export type TMemberCompanyInfo = {
  id: string
  name: string
  logoUrl: string | null
}

export type TManagementCompanyMemberWithCompany = TManagementCompanyMember & {
  managementCompanyInfo: TMemberCompanyInfo
}

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
      userRoleId: r.userRoleId,
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
      userRoleId: dto.userRoleId,
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
    if (dto.userRoleId !== undefined) values.userRoleId = dto.userRoleId
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
   * Get all members by management company ID with user details
   */
  async listByCompanyIdWithUsers(
    companyId: string,
    includeInactive = false
  ): Promise<TManagementCompanyMemberWithUser[]> {
    const conditions = [eq(managementCompanyMembers.managementCompanyId, companyId)]

    if (!includeInactive) {
      conditions.push(eq(managementCompanyMembers.isActive, true))
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined

    const results = await this.db
      .select({
        member: managementCompanyMembers,
        user: users,
      })
      .from(managementCompanyMembers)
      .leftJoin(users, eq(managementCompanyMembers.userId, users.id))
      .where(whereClause)
      .orderBy(desc(managementCompanyMembers.joinedAt))

    return results.map(({ member, user }) => ({
      ...this.mapToEntity(member),
      user: user
        ? {
            id: user.id,
            email: user.email,
            displayName: user.displayName,
            firstName: user.firstName,
            lastName: user.lastName,
            photoUrl: user.photoUrl,
          }
        : null,
    }))
  }

  /**
   * Get members by management company ID with pagination, filtering, and user details.
   * Results are sorted by isPrimaryAdmin (primary first), then by joinedAt.
   */
  async listByCompanyIdPaginated(
    companyId: string,
    query: TManagementCompanyMembersQuerySchema
  ): Promise<TPaginatedResponse<TManagementCompanyMemberWithUser>> {
    const { page = 1, limit = 20, search, roleName, isActive, condominiumId } = query
    const offset = (page - 1) * limit

    // Build conditions for members table
    const memberConditions = [eq(managementCompanyMembers.managementCompanyId, companyId)]

    // Filter by isActive
    if (isActive !== undefined) {
      memberConditions.push(eq(managementCompanyMembers.isActive, isActive))
    }

    // Filter by role
    if (roleName) {
      memberConditions.push(eq(managementCompanyMembers.roleName, roleName))
    }

    // Build search condition (searches in user name and email)
    let searchCondition
    if (search && search.trim()) {
      const searchTerm = `%${search.trim()}%`
      searchCondition = or(
        ilike(users.email, searchTerm),
        ilike(users.displayName, searchTerm),
        ilike(users.firstName, searchTerm),
        ilike(users.lastName, searchTerm)
      )
    }

    // Filter by condominiumId: members who have a user_role in the specified condominium
    let condominiumCondition
    if (condominiumId) {
      condominiumCondition = and(
        eq(userRoles.condominiumId, condominiumId),
        eq(userRoles.isActive, true)
      )
    }

    // Combine conditions
    const allConditions = [...memberConditions]
    if (searchCondition) allConditions.push(searchCondition)
    if (condominiumCondition) allConditions.push(condominiumCondition)
    const whereClause = and(...allConditions)

    // Build base query — conditionally join userRoles when filtering by condominium
    // When condominiumId is set, the join to userRoles can produce duplicates,
    // so we use DISTINCT ON (which requires id first in ORDER BY).
    // Otherwise, we use a simple select with desired ordering.
    let results: { member: typeof managementCompanyMembers.$inferSelect; user: typeof users.$inferSelect | null }[]

    if (condominiumId) {
      const baseQuery = this.db
        .selectDistinctOn([managementCompanyMembers.id], {
          member: managementCompanyMembers,
          user: users,
        })
        .from(managementCompanyMembers)
        .leftJoin(users, eq(managementCompanyMembers.userId, users.id))
        .innerJoin(userRoles, eq(managementCompanyMembers.userId, userRoles.userId))

      results = await baseQuery
        .where(whereClause)
        .orderBy(managementCompanyMembers.id, desc(managementCompanyMembers.isPrimaryAdmin), desc(managementCompanyMembers.joinedAt))
        .limit(limit)
        .offset(offset)

      // Re-sort in memory since DISTINCT ON forces id-first ordering
      results.sort((a, b) => {
        if (a.member.isPrimaryAdmin !== b.member.isPrimaryAdmin) {
          return a.member.isPrimaryAdmin ? -1 : 1
        }
        const aDate = a.member.joinedAt?.getTime() ?? 0
        const bDate = b.member.joinedAt?.getTime() ?? 0
        return bDate - aDate
      })
    } else {
      const baseQuery = this.db
        .select({
          member: managementCompanyMembers,
          user: users,
        })
        .from(managementCompanyMembers)
        .leftJoin(users, eq(managementCompanyMembers.userId, users.id))

      results = await baseQuery
        .where(whereClause)
        .orderBy(desc(managementCompanyMembers.isPrimaryAdmin), desc(managementCompanyMembers.joinedAt))
        .limit(limit)
        .offset(offset)
    }

    // Get total count
    const countQuery = this.db
      .select({ count: sql<number>`count(distinct ${managementCompanyMembers.id})::int` })
      .from(managementCompanyMembers)
      .leftJoin(users, eq(managementCompanyMembers.userId, users.id))

    if (condominiumId) {
      countQuery.innerJoin(userRoles, eq(managementCompanyMembers.userId, userRoles.userId))
    }

    const countResult = await countQuery.where(whereClause)

    const total = countResult[0]?.count ?? 0
    const totalPages = Math.ceil(total / limit)

    return {
      data: results.map(({ member, user }) => ({
        ...this.mapToEntity(member),
        user: user
          ? {
              id: user.id,
              email: user.email,
              displayName: user.displayName,
              firstName: user.firstName,
              lastName: user.lastName,
              photoUrl: user.photoUrl,
            }
          : null,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    }
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
    permissions: TMemberPermissions | null,
    invitedBy?: string | null,
    userRoleId?: string | null
  ): Promise<TManagementCompanyMember> {
    const dto: TManagementCompanyMemberCreate = {
      managementCompanyId: companyId,
      userId,
      roleName: role,
      userRoleId: userRoleId ?? null,
      isPrimaryAdmin: isPrimary,
      permissions,
      isActive: true,
      joinedAt: new Date(),
      invitedAt: invitedBy ? new Date() : null,
      invitedBy: invitedBy ?? null,
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

  /**
   * Get all active memberships for a user, with management company info.
   * Used by /me/management-companies to discover which companies a user belongs to.
   */
  async listByUserIdWithCompany(userId: string): Promise<TManagementCompanyMemberWithCompany[]> {
    const results = await this.db
      .select({
        member: managementCompanyMembers,
        company: {
          id: managementCompanies.id,
          name: managementCompanies.name,
          logoUrl: managementCompanies.logoUrl,
        },
      })
      .from(managementCompanyMembers)
      .innerJoin(
        managementCompanies,
        eq(managementCompanyMembers.managementCompanyId, managementCompanies.id)
      )
      .where(
        and(
          eq(managementCompanyMembers.userId, userId),
          eq(managementCompanyMembers.isActive, true),
          eq(managementCompanies.isActive, true)
        )
      )
      .orderBy(desc(managementCompanyMembers.isPrimaryAdmin), desc(managementCompanyMembers.joinedAt))

    return results.map(({ member, company }) => ({
      ...this.mapToEntity(member),
      managementCompanyInfo: company,
    }))
  }
}
