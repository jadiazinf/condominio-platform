import { eq, and, or, ilike, sql, desc, inArray, isNull } from 'drizzle-orm'
import type { TUser, TUserCreate, TUserUpdate, TPaginatedResponse, TPermission } from '@packages/domain'
import {
  users,
  userRoles,
  roles,
  condominiums,
  rolePermissions,
  permissions,
  userPermissions,
} from '@database/drizzle/schema'
import type { TDrizzleClient, IRepository } from './interfaces'
import { BaseRepository } from './base'

type TUserRecord = typeof users.$inferSelect

import { ESystemRole } from '@packages/domain'

/**
 * Query parameters for listing all users
 */
export interface TAllUsersQuery {
  page?: number
  limit?: number
  search?: string
  isActive?: boolean
  roleId?: string
}

/**
 * User role summary (for list view)
 */
export interface TUserRoleSummary {
  id: string // userRole id
  roleId: string
  roleName: string
  condominiumId: string | null
  condominiumName: string | null
  isActive: boolean
}

/**
 * User with roles summary (for list view)
 */
export interface TUserWithRoles {
  id: string
  email: string
  displayName: string | null
  firstName: string | null
  lastName: string | null
  photoUrl: string | null
  phoneCountryCode: string | null
  phoneNumber: string | null
  idDocumentType: 'CI' | 'RIF' | 'Pasaporte' | null
  idDocumentNumber: string | null
  isActive: boolean
  lastLogin: Date | null
  createdAt: Date
  roles: TUserRoleSummary[]
}

/**
 * User role detail (for detail view)
 */
export interface TUserRoleDetail {
  id: string
  roleId: string
  roleName: string
  roleDescription: string | null
  isSystemRole: boolean
  condominiumId: string | null
  condominiumName: string | null
  buildingId: string | null
  isActive: boolean
  assignedAt: Date
  notes: string | null
}

/**
 * Condominium with roles (for detail view)
 */
export interface TCondominiumWithRoles {
  id: string
  name: string
  code: string | null
  roles: Array<{
    userRoleId: string
    roleId: string
    roleName: string
    isActive: boolean
  }>
}

/**
 * Permission with enabled status for superadmin detail view
 */
export interface TSuperadminPermissionDetail {
  id: string
  permissionId: string
  module: string
  action: string
  description: string | null
  isEnabled: boolean
}

/**
 * Full user details (for detail view)
 */
export interface TUserFullDetails {
  id: string
  email: string
  displayName: string | null
  firstName: string | null
  lastName: string | null
  photoUrl: string | null
  phoneCountryCode: string | null
  phoneNumber: string | null
  address: string | null
  idDocumentType: 'CI' | 'RIF' | 'Pasaporte' | null
  idDocumentNumber: string | null
  isActive: boolean
  isEmailVerified: boolean
  lastLogin: Date | null
  createdAt: Date
  updatedAt: Date
  userRoles: TUserRoleDetail[]
  isSuperadmin: boolean
  superadminPermissions: TSuperadminPermissionDetail[] | null
  condominiums: TCondominiumWithRoles[] | null
}

/**
 * Repository for managing user entities.
 * Implements soft delete pattern via isActive flag.
 */
export class UsersRepository
  extends BaseRepository<typeof users, TUser, TUserCreate, TUserUpdate>
  implements IRepository<TUser, TUserCreate, TUserUpdate>
{
  constructor(db: TDrizzleClient) {
    super(db, users)
  }

  protected mapToEntity(record: unknown): TUser {
    const r = record as TUserRecord
    return {
      id: r.id,
      firebaseUid: r.firebaseUid,
      email: r.email,
      displayName: r.displayName,
      phoneCountryCode: r.phoneCountryCode,
      phoneNumber: r.phoneNumber,
      photoUrl: r.photoUrl,
      firstName: r.firstName,
      lastName: r.lastName,
      idDocumentType: r.idDocumentType as TUser['idDocumentType'],
      idDocumentNumber: r.idDocumentNumber,
      address: r.address,
      locationId: r.locationId,
      preferredLanguage: (r.preferredLanguage ?? 'es') as TUser['preferredLanguage'],
      preferredCurrencyId: r.preferredCurrencyId,
      isActive: r.isActive ?? true,
      isEmailVerified: r.isEmailVerified ?? false,
      lastLogin: r.lastLogin,
      metadata: r.metadata as Record<string, unknown> | null,
      createdAt: r.createdAt ?? new Date(),
      updatedAt: r.updatedAt ?? new Date(),
    }
  }

  protected mapToInsertValues(dto: TUserCreate): Record<string, unknown> {
    return {
      firebaseUid: dto.firebaseUid,
      email: dto.email,
      displayName: dto.displayName,
      phoneCountryCode: dto.phoneCountryCode,
      phoneNumber: dto.phoneNumber,
      photoUrl: dto.photoUrl,
      firstName: dto.firstName,
      lastName: dto.lastName,
      idDocumentType: dto.idDocumentType,
      idDocumentNumber: dto.idDocumentNumber,
      address: dto.address,
      locationId: dto.locationId,
      preferredLanguage: dto.preferredLanguage,
      preferredCurrencyId: dto.preferredCurrencyId,
      isActive: dto.isActive,
      isEmailVerified: dto.isEmailVerified,
      lastLogin: dto.lastLogin,
      metadata: dto.metadata,
    }
  }

  protected mapToUpdateValues(dto: TUserUpdate): Record<string, unknown> {
    const values: Record<string, unknown> = {}

    if (dto.firebaseUid !== undefined) values.firebaseUid = dto.firebaseUid
    if (dto.email !== undefined) values.email = dto.email
    if (dto.displayName !== undefined) values.displayName = dto.displayName
    if (dto.phoneCountryCode !== undefined) values.phoneCountryCode = dto.phoneCountryCode
    if (dto.phoneNumber !== undefined) values.phoneNumber = dto.phoneNumber
    if (dto.photoUrl !== undefined) values.photoUrl = dto.photoUrl
    if (dto.firstName !== undefined) values.firstName = dto.firstName
    if (dto.lastName !== undefined) values.lastName = dto.lastName
    if (dto.idDocumentType !== undefined) values.idDocumentType = dto.idDocumentType
    if (dto.idDocumentNumber !== undefined) values.idDocumentNumber = dto.idDocumentNumber
    if (dto.address !== undefined) values.address = dto.address
    if (dto.locationId !== undefined) values.locationId = dto.locationId
    if (dto.preferredLanguage !== undefined) values.preferredLanguage = dto.preferredLanguage
    if (dto.preferredCurrencyId !== undefined) values.preferredCurrencyId = dto.preferredCurrencyId
    if (dto.isActive !== undefined) values.isActive = dto.isActive
    if (dto.isEmailVerified !== undefined) values.isEmailVerified = dto.isEmailVerified
    if (dto.lastLogin !== undefined) values.lastLogin = dto.lastLogin
    if (dto.metadata !== undefined) values.metadata = dto.metadata

    return values
  }

  /**
   * Retrieves a user by Firebase UID.
   */
  async getByFirebaseUid(firebaseUid: string): Promise<TUser | null> {
    const results = await this.db
      .select()
      .from(users)
      .where(eq(users.firebaseUid, firebaseUid))
      .limit(1)

    const record = results[0]
    if (!record) {
      return null
    }

    return this.mapToEntity(record)
  }

  /**
   * Retrieves a user by email.
   */
  async getByEmail(email: string): Promise<TUser | null> {
    const results = await this.db.select().from(users).where(eq(users.email, email)).limit(1)

    const record = results[0]
    if (!record) {
      return null
    }

    return this.mapToEntity(record)
  }

  /**
   * Updates the last login timestamp.
   */
  async updateLastLogin(id: string): Promise<TUser | null> {
    const results = await this.db
      .update(users)
      .set({ lastLogin: new Date(), updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning()

    const record = results[0]
    if (!record) {
      return null
    }

    return this.mapToEntity(record)
  }

  /**
   * Updates user status (isActive).
   */
  async updateStatus(id: string, isActive: boolean): Promise<TUser | null> {
    const results = await this.db
      .update(users)
      .set({ isActive, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning()

    const record = results[0]
    if (!record) {
      return null
    }

    return this.mapToEntity(record)
  }

  /**
   * Checks if a user is a superadmin (has SUPERADMIN role with no scope).
   */
  async checkIsSuperadmin(userId: string): Promise<boolean> {
    const result = await this.db
      .select({ roleId: userRoles.roleId })
      .from(userRoles)
      .innerJoin(roles, eq(userRoles.roleId, roles.id))
      .where(
        and(
          eq(userRoles.userId, userId),
          eq(roles.name, ESystemRole.SUPERADMIN),
          isNull(userRoles.condominiumId),
          isNull(userRoles.buildingId),
          or(eq(userRoles.isActive, true), isNull(userRoles.isActive))
        )
      )
      .limit(1)

    return result.length > 0
  }

  /**
   * Lists all users with pagination, search, and role filtering.
   */
  async listAllUsersPaginated(query: TAllUsersQuery): Promise<TPaginatedResponse<TUserWithRoles>> {
    const { page = 1, limit = 20, search, isActive, roleId } = query
    const offset = (page - 1) * limit

    // Build conditions for users table
    const userConditions = []

    if (isActive !== undefined) {
      userConditions.push(eq(users.isActive, isActive))
    }

    if (search && search.trim()) {
      const searchTerm = `%${search.trim()}%`
      userConditions.push(
        or(
          ilike(users.firstName, searchTerm),
          ilike(users.lastName, searchTerm),
          ilike(users.email, searchTerm),
          ilike(users.displayName, searchTerm),
          ilike(users.idDocumentNumber, searchTerm)
        )!
      )
    }

    // If filtering by role, we need to join with userRoles
    let userIdsWithRole: string[] | null = null
    if (roleId) {
      const usersWithRole = await this.db
        .select({ userId: userRoles.userId })
        .from(userRoles)
        .where(eq(userRoles.roleId, roleId))

      userIdsWithRole = [...new Set(usersWithRole.map(u => u.userId))]

      if (userIdsWithRole.length === 0) {
        // No users with this role, return empty result
        return {
          data: [],
          pagination: { page, limit, total: 0, totalPages: 0 },
        }
      }
    }

    const whereClause = userConditions.length > 0 ? and(...userConditions) : undefined

    // Get paginated users
    let usersQuery = this.db
      .select({
        id: users.id,
        email: users.email,
        displayName: users.displayName,
        firstName: users.firstName,
        lastName: users.lastName,
        photoUrl: users.photoUrl,
        phoneCountryCode: users.phoneCountryCode,
        phoneNumber: users.phoneNumber,
        idDocumentType: users.idDocumentType,
        idDocumentNumber: users.idDocumentNumber,
        isActive: users.isActive,
        lastLogin: users.lastLogin,
        createdAt: users.createdAt,
      })
      .from(users)
      .orderBy(desc(users.createdAt))
      .limit(limit)
      .offset(offset)

    let usersResults
    if (whereClause) {
      if (userIdsWithRole) {
        // Filter by role AND other conditions
        usersResults = await usersQuery.where(
          and(whereClause, inArray(users.id, userIdsWithRole))
        )
      } else {
        usersResults = await usersQuery.where(whereClause)
      }
    } else if (userIdsWithRole) {
      // Filter by role only
      usersResults = await usersQuery.where(inArray(users.id, userIdsWithRole))
    } else {
      usersResults = await usersQuery
    }

    // Get total count
    let countResult
    if (whereClause) {
      if (userIdsWithRole) {
        countResult = await this.db
          .select({ count: sql<number>`count(*)::int` })
          .from(users)
          .where(and(whereClause, inArray(users.id, userIdsWithRole)))
      } else {
        countResult = await this.db
          .select({ count: sql<number>`count(*)::int` })
          .from(users)
          .where(whereClause)
      }
    } else if (userIdsWithRole) {
      countResult = await this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(users)
        .where(inArray(users.id, userIdsWithRole))
    } else {
      countResult = await this.db.select({ count: sql<number>`count(*)::int` }).from(users)
    }

    const total = countResult[0]?.count ?? 0
    const totalPages = Math.ceil(total / limit)

    // Get roles for all users in the result
    const userIds = usersResults.map(u => u.id)

    let userRolesMap = new Map<string, TUserRoleSummary[]>()

    if (userIds.length > 0) {
      const rolesResults = await this.db
        .select({
          userRoleId: userRoles.id,
          userId: userRoles.userId,
          roleId: userRoles.roleId,
          roleName: roles.name,
          condominiumId: userRoles.condominiumId,
          condominiumName: condominiums.name,
          isActive: userRoles.isActive,
        })
        .from(userRoles)
        .innerJoin(roles, eq(userRoles.roleId, roles.id))
        .leftJoin(condominiums, eq(userRoles.condominiumId, condominiums.id))
        .where(inArray(userRoles.userId, userIds))

      for (const role of rolesResults) {
        const existingRoles = userRolesMap.get(role.userId) ?? []
        existingRoles.push({
          id: role.userRoleId,
          roleId: role.roleId,
          roleName: role.roleName,
          condominiumId: role.condominiumId,
          condominiumName: role.condominiumName,
          isActive: role.isActive ?? true,
        })
        userRolesMap.set(role.userId, existingRoles)
      }
    }

    // Map results
    const data: TUserWithRoles[] = usersResults.map(user => ({
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      firstName: user.firstName,
      lastName: user.lastName,
      photoUrl: user.photoUrl,
      phoneCountryCode: user.phoneCountryCode,
      phoneNumber: user.phoneNumber,
      idDocumentType: user.idDocumentType as 'CI' | 'RIF' | 'Pasaporte' | null,
      idDocumentNumber: user.idDocumentNumber,
      isActive: user.isActive ?? true,
      lastLogin: user.lastLogin,
      createdAt: user.createdAt ?? new Date(),
      roles: userRolesMap.get(user.id) ?? [],
    }))

    return {
      data,
      pagination: { page, limit, total, totalPages },
    }
  }

  /**
   * Gets full user details including roles, condominiums, and permissions.
   */
  async getUserFullDetails(userId: string): Promise<TUserFullDetails | null> {
    // Get user
    const userResult = await this.db.select().from(users).where(eq(users.id, userId)).limit(1)

    if (!userResult[0]) {
      return null
    }

    const user = userResult[0]

    // Get all user roles with role details
    const userRolesResults = await this.db
      .select({
        id: userRoles.id,
        roleId: userRoles.roleId,
        roleName: roles.name,
        roleDescription: roles.description,
        isSystemRole: roles.isSystemRole,
        condominiumId: userRoles.condominiumId,
        condominiumName: condominiums.name,
        buildingId: userRoles.buildingId,
        isActive: userRoles.isActive,
        assignedAt: userRoles.assignedAt,
        notes: userRoles.notes,
      })
      .from(userRoles)
      .innerJoin(roles, eq(userRoles.roleId, roles.id))
      .leftJoin(condominiums, eq(userRoles.condominiumId, condominiums.id))
      .where(eq(userRoles.userId, userId))

    const userRoleDetails: TUserRoleDetail[] = userRolesResults.map(role => ({
      id: role.id,
      roleId: role.roleId,
      roleName: role.roleName,
      roleDescription: role.roleDescription,
      isSystemRole: role.isSystemRole ?? false,
      condominiumId: role.condominiumId,
      condominiumName: role.condominiumName,
      buildingId: role.buildingId,
      isActive: role.isActive ?? true,
      assignedAt: role.assignedAt ?? new Date(),
      notes: role.notes,
    }))

    // Check if user is superadmin (has SUPERADMIN role with no condominium/building scope)
    const superadminRole = userRolesResults.find(
      role =>
        role.roleName === ESystemRole.SUPERADMIN &&
        role.condominiumId === null &&
        role.buildingId === null &&
        (role.isActive ?? true)
    )

    const isSuperadmin = !!superadminRole

    // Get superadmin permissions if user is superadmin
    let superadminPermissions: TSuperadminPermissionDetail[] | null = null
    if (isSuperadmin && superadminRole) {
      // Get all permissions available for the SUPERADMIN role
      const rolePermsResults = await this.db
        .select({
          permissionId: permissions.id,
          module: permissions.module,
          action: permissions.action,
          description: permissions.description,
        })
        .from(rolePermissions)
        .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
        .where(eq(rolePermissions.roleId, superadminRole.roleId))

      // Get user-specific permissions (if any)
      const userPermsResults = await this.db
        .select({
          id: userPermissions.id,
          permissionId: userPermissions.permissionId,
          isEnabled: userPermissions.isEnabled,
        })
        .from(userPermissions)
        .where(eq(userPermissions.userId, userId))

      // Create a map of user permissions for quick lookup
      const userPermsMap = new Map(
        userPermsResults.map(up => [up.permissionId, { id: up.id, isEnabled: up.isEnabled ?? true }])
      )

      // Merge role permissions with user permissions
      superadminPermissions = rolePermsResults.map(rp => {
        const userPerm = userPermsMap.get(rp.permissionId)
        return {
          id: userPerm?.id ?? rp.permissionId, // Use userPermission id if exists, otherwise permissionId
          permissionId: rp.permissionId,
          module: rp.module,
          action: rp.action,
          description: rp.description,
          isEnabled: userPerm?.isEnabled ?? false, // Default to disabled if not in user_permissions
        }
      })
    }

    // Get condominiums for non-superadmin users
    let condominiumsWithRoles: TCondominiumWithRoles[] | null = null
    if (!isSuperadmin) {
      // Get unique condominiums from user roles
      const condominiumRoles = userRolesResults.filter(role => role.condominiumId !== null)
      const condominiumMap = new Map<string, TCondominiumWithRoles>()

      for (const role of condominiumRoles) {
        if (!role.condominiumId || !role.condominiumName) continue

        if (!condominiumMap.has(role.condominiumId)) {
          // Get condominium code
          const condoResult = await this.db
            .select({ code: condominiums.code })
            .from(condominiums)
            .where(eq(condominiums.id, role.condominiumId))
            .limit(1)

          condominiumMap.set(role.condominiumId, {
            id: role.condominiumId,
            name: role.condominiumName,
            code: condoResult[0]?.code ?? null,
            roles: [],
          })
        }

        const condo = condominiumMap.get(role.condominiumId)!
        condo.roles.push({
          userRoleId: role.id,
          roleId: role.roleId,
          roleName: role.roleName,
          isActive: role.isActive ?? true,
        })
      }

      condominiumsWithRoles = Array.from(condominiumMap.values())
    }

    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      firstName: user.firstName,
      lastName: user.lastName,
      photoUrl: user.photoUrl,
      phoneCountryCode: user.phoneCountryCode,
      phoneNumber: user.phoneNumber,
      address: user.address,
      idDocumentType: user.idDocumentType as 'CI' | 'RIF' | 'Pasaporte' | null,
      idDocumentNumber: user.idDocumentNumber,
      isActive: user.isActive ?? true,
      isEmailVerified: user.isEmailVerified ?? false,
      lastLogin: user.lastLogin,
      createdAt: user.createdAt ?? new Date(),
      updatedAt: user.updatedAt ?? new Date(),
      userRoles: userRoleDetails,
      isSuperadmin,
      superadminPermissions,
      condominiums: condominiumsWithRoles,
    }
  }

  /**
   * Gets all roles in the system (for filter dropdown).
   */
  async getAllRoles(): Promise<Array<{ id: string; name: string; isSystemRole: boolean }>> {
    const results = await this.db
      .select({
        id: roles.id,
        name: roles.name,
        isSystemRole: roles.isSystemRole,
      })
      .from(roles)
      .orderBy(roles.name)

    return results.map(r => ({
      id: r.id,
      name: r.name,
      isSystemRole: r.isSystemRole ?? false,
    }))
  }
}
