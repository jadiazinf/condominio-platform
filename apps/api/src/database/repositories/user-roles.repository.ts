import { and, eq, isNull, desc, or, ilike, sql } from 'drizzle-orm'
import type {
  TUserRole,
  TUserRoleCreate,
  TUserRoleUpdate,
  TUser,
  TPermission,
  TPaginatedResponse,
} from '@packages/domain'
import { userRoles, roles, users, rolePermissions, permissions } from '@database/drizzle/schema'
import type { TDrizzleClient, IRepositoryWithHardDelete } from './interfaces'
import { BaseRepository } from './base'

type TUserRoleRecord = typeof userRoles.$inferSelect

const SUPERADMIN_ROLE_NAME = 'SUPERADMIN'

/**
 * Type for superadmin user with user details
 */
export type TSuperadminUserWithDetails = Omit<TUserRole, 'user' | 'role' | 'assignedByUser'> & {
  user: {
    id: string
    email: string
    displayName: string | null
    firstName: string | null
    lastName: string | null
    photoUrl: string | null
    idDocumentType: 'CI' | 'RIF' | 'Pasaporte' | null
    idDocumentNumber: string | null
    isActive: boolean
    lastLogin: Date | null
  }
}

/**
 * Query parameters for listing superadmin users
 */
export interface TSuperadminUsersQuery {
  page?: number
  limit?: number
  search?: string
  isActive?: boolean
}

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
      managementCompanyId: r.managementCompanyId,
      isActive: r.isActive ?? true,
      notes: r.notes,
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
      managementCompanyId: dto.managementCompanyId,
      isActive: dto.isActive,
      notes: dto.notes,
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
    if (dto.isActive !== undefined) values.isActive = dto.isActive
    if (dto.notes !== undefined) values.notes = dto.notes
    if (dto.assignedBy !== undefined) values.assignedBy = dto.assignedBy
    if (dto.managementCompanyId !== undefined) values.managementCompanyId = dto.managementCompanyId
    if (dto.registeredBy !== undefined) values.registeredBy = dto.registeredBy
    if (dto.expiresAt !== undefined) values.expiresAt = dto.expiresAt

    return values
  }

  /**
   * Override listAll to return all user-roles.
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
   * Retrieves user roles for a specific user, role, and optionally condominium.
   */
  async getByUserAndRole(
    userId: string,
    roleId: string,
    condominiumId: string | null
  ): Promise<TUserRole[]> {
    const conditions = [eq(userRoles.userId, userId), eq(userRoles.roleId, roleId)]

    if (condominiumId) {
      conditions.push(eq(userRoles.condominiumId, condominiumId))
    } else {
      conditions.push(isNull(userRoles.condominiumId))
    }

    const results = await this.db
      .select()
      .from(userRoles)
      .where(and(...conditions))

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

  // ==========================================================================
  // SUPERADMIN METHODS
  // ==========================================================================

  /**
   * Gets the SUPERADMIN role ID.
   */
  async getSuperadminRoleId(): Promise<string | null> {
    const result = await this.db
      .select({ id: roles.id })
      .from(roles)
      .where(eq(roles.name, SUPERADMIN_ROLE_NAME))
      .limit(1)

    return result[0]?.id ?? null
  }

  /**
   * Gets the superadmin user role for a specific user.
   * Returns null if the user is not a superadmin.
   */
  async getSuperadminUserRole(userId: string): Promise<TUserRole | null> {
    const superadminRoleId = await this.getSuperadminRoleId()
    if (!superadminRoleId) return null

    const results = await this.db
      .select()
      .from(userRoles)
      .where(
        and(
          eq(userRoles.userId, userId),
          eq(userRoles.roleId, superadminRoleId),
          isNull(userRoles.condominiumId),
          isNull(userRoles.buildingId)
        )
      )
      .limit(1)

    if (results.length === 0) return null
    return this.mapToEntity(results[0])
  }

  /**
   * Checks if a user is an active superadmin.
   */
  async isUserSuperadmin(userId: string): Promise<boolean> {
    const superadminRole = await this.getSuperadminUserRole(userId)
    return superadminRole !== null && superadminRole.isActive
  }

  /**
   * Gets all active superadmin users (TUser objects).
   * Useful for assignment dropdowns.
   */
  async getActiveSuperadminUsers(): Promise<TUser[]> {
    const superadminRoleId = await this.getSuperadminRoleId()
    if (!superadminRoleId) return []

    const results = await this.db
      .select({
        id: users.id,
        firebaseUid: users.firebaseUid,
        email: users.email,
        displayName: users.displayName,
        firstName: users.firstName,
        lastName: users.lastName,
        phoneCountryCode: users.phoneCountryCode,
        phoneNumber: users.phoneNumber,
        photoUrl: users.photoUrl,
        address: users.address,
        locationId: users.locationId,
        preferredLanguage: users.preferredLanguage,
        preferredCurrencyId: users.preferredCurrencyId,
        isActive: users.isActive,
        isEmailVerified: users.isEmailVerified,
        lastLogin: users.lastLogin,
        idDocumentType: users.idDocumentType,
        idDocumentNumber: users.idDocumentNumber,
        metadata: users.metadata,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(userRoles)
      .innerJoin(users, eq(userRoles.userId, users.id))
      .where(
        and(
          eq(userRoles.roleId, superadminRoleId),
          isNull(userRoles.condominiumId),
          isNull(userRoles.buildingId),
          eq(userRoles.isActive, true)
        )
      )

    return results.map(r => ({
      id: r.id,
      firebaseUid: r.firebaseUid,
      email: r.email,
      displayName: r.displayName,
      firstName: r.firstName,
      lastName: r.lastName,
      phoneCountryCode: r.phoneCountryCode,
      phoneNumber: r.phoneNumber,
      photoUrl: r.photoUrl,
      address: r.address,
      locationId: r.locationId,
      preferredLanguage: (r.preferredLanguage ?? 'es') as 'es' | 'en',
      preferredCurrencyId: r.preferredCurrencyId,
      isActive: r.isActive ?? true,
      isEmailVerified: r.isEmailVerified ?? false,
      lastLogin: r.lastLogin,
      idDocumentType: r.idDocumentType as 'CI' | 'RIF' | 'Pasaporte' | null,
      idDocumentNumber: r.idDocumentNumber,
      metadata: (r.metadata ?? null) as Record<string, unknown> | null,
      createdAt: r.createdAt ?? new Date(),
      updatedAt: r.updatedAt ?? new Date(),
    }))
  }

  /**
   * Lists superadmin users with pagination and user details.
   */
  async listSuperadminUsersPaginated(
    query: TSuperadminUsersQuery
  ): Promise<TPaginatedResponse<TSuperadminUserWithDetails>> {
    const { page = 1, limit = 20, search, isActive } = query
    const offset = (page - 1) * limit

    const superadminRoleId = await this.getSuperadminRoleId()
    if (!superadminRoleId) {
      return {
        data: [],
        pagination: { page, limit, total: 0, totalPages: 0 },
      }
    }

    // Build conditions
    const conditions = [
      eq(userRoles.roleId, superadminRoleId),
      isNull(userRoles.condominiumId),
      isNull(userRoles.buildingId),
    ]

    if (isActive !== undefined) {
      conditions.push(eq(userRoles.isActive, isActive))
    }

    if (search && search.trim()) {
      const searchTerm = `%${search.trim()}%`
      conditions.push(
        or(
          ilike(users.firstName, searchTerm),
          ilike(users.lastName, searchTerm),
          ilike(users.email, searchTerm),
          ilike(users.idDocumentNumber, searchTerm)
        )!
      )
    }

    const whereClause = and(...conditions)

    // Get paginated data
    const results = await this.db
      .select({
        id: userRoles.id,
        userId: userRoles.userId,
        roleId: userRoles.roleId,
        condominiumId: userRoles.condominiumId,
        buildingId: userRoles.buildingId,
        managementCompanyId: userRoles.managementCompanyId,
        isActive: userRoles.isActive,
        notes: userRoles.notes,
        assignedAt: userRoles.assignedAt,
        assignedBy: userRoles.assignedBy,
        registeredBy: userRoles.registeredBy,
        expiresAt: userRoles.expiresAt,
        userEmail: users.email,
        userDisplayName: users.displayName,
        userFirstName: users.firstName,
        userLastName: users.lastName,
        userPhotoUrl: users.photoUrl,
        userIdDocumentType: users.idDocumentType,
        userIdDocumentNumber: users.idDocumentNumber,
        userIsActive: users.isActive,
        userLastLogin: users.lastLogin,
      })
      .from(userRoles)
      .innerJoin(users, eq(userRoles.userId, users.id))
      .where(whereClause)
      .orderBy(desc(userRoles.assignedAt))
      .limit(limit)
      .offset(offset)

    // Get total count
    const countResult = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(userRoles)
      .innerJoin(users, eq(userRoles.userId, users.id))
      .where(whereClause)

    const total = countResult[0]?.count ?? 0
    const totalPages = Math.ceil(total / limit)

    return {
      data: results.map(r => ({
        id: r.id,
        userId: r.userId,
        roleId: r.roleId,
        condominiumId: r.condominiumId,
        buildingId: r.buildingId,
        managementCompanyId: r.managementCompanyId ?? null,
        isActive: r.isActive ?? true,
        notes: r.notes,
        assignedAt: r.assignedAt ?? new Date(),
        assignedBy: r.assignedBy,
        registeredBy: r.registeredBy,
        expiresAt: r.expiresAt,
        user: {
          id: r.userId,
          email: r.userEmail,
          displayName: r.userDisplayName,
          firstName: r.userFirstName,
          lastName: r.userLastName,
          photoUrl: r.userPhotoUrl,
          idDocumentType: r.userIdDocumentType as 'CI' | 'RIF' | 'Pasaporte' | null,
          idDocumentNumber: r.userIdDocumentNumber,
          isActive: r.userIsActive ?? true,
          lastLogin: r.userLastLogin,
        },
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    }
  }

  // ==========================================================================
  // MANAGEMENT COMPANY METHODS
  // ==========================================================================

  /**
   * Retrieves user roles scoped to a specific management company.
   */
  async getByUserAndManagementCompany(
    userId: string,
    managementCompanyId: string
  ): Promise<TUserRole[]> {
    const results = await this.db
      .select()
      .from(userRoles)
      .where(
        and(
          eq(userRoles.userId, userId),
          eq(userRoles.managementCompanyId, managementCompanyId)
        )
      )

    return results.map(record => this.mapToEntity(record))
  }

  /**
   * Creates a management company–scoped role for a user.
   */
  async createManagementCompanyRole(
    userId: string,
    roleId: string,
    managementCompanyId: string,
    assignedBy?: string
  ): Promise<TUserRole> {
    return this.create({
      userId,
      roleId,
      condominiumId: null,
      buildingId: null,
      managementCompanyId,
      isActive: true,
      assignedBy: assignedBy ?? null,
      registeredBy: assignedBy ?? null,
      notes: null,
      expiresAt: null,
    })
  }

  /**
   * Gets the role ID by role name.
   */
  async getRoleIdByName(roleName: string): Promise<string | null> {
    const result = await this.db
      .select({ id: roles.id })
      .from(roles)
      .where(eq(roles.name, roleName))
      .limit(1)

    return result[0]?.id ?? null
  }

  /**
   * Gets permissions for the superadmin role.
   */
  async getSuperadminPermissions(): Promise<TPermission[]> {
    const superadminRoleId = await this.getSuperadminRoleId()
    if (!superadminRoleId) return []

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
      .from(rolePermissions)
      .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
      .where(eq(rolePermissions.roleId, superadminRoleId))

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
