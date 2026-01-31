import { eq } from 'drizzle-orm'
import type {
  TSuperadminUser,
  TSuperadminUserCreate,
  TSuperadminUserUpdate,
  TUser,
} from '@packages/domain'
import { superadminUsers, users } from '@database/drizzle/schema'
import type { TDrizzleClient } from './interfaces'
import { BaseRepository } from './base'

type TSuperadminUserRecord = typeof superadminUsers.$inferSelect

export class SuperadminUsersRepository extends BaseRepository<
  typeof superadminUsers,
  TSuperadminUser,
  TSuperadminUserCreate,
  TSuperadminUserUpdate
> {
  constructor(db: TDrizzleClient) {
    super(db, superadminUsers)
  }

  protected mapToEntity(record: unknown): TSuperadminUser {
    const r = record as TSuperadminUserRecord
    return {
      id: r.id,
      userId: r.userId,
      notes: r.notes,
      isActive: r.isActive ?? true,
      lastAccessAt: r.lastAccessAt,
      createdAt: r.createdAt ?? new Date(),
      updatedAt: r.updatedAt ?? new Date(),
      createdBy: r.createdBy,
    }
  }

  protected mapToInsertValues(dto: TSuperadminUserCreate): Record<string, unknown> {
    return {
      userId: dto.userId,
      notes: dto.notes,
      isActive: dto.isActive,
      createdBy: dto.createdBy,
    }
  }

  protected mapToUpdateValues(dto: TSuperadminUserUpdate): Record<string, unknown> {
    const values: Record<string, unknown> = {}

    if (dto.userId !== undefined) values.userId = dto.userId
    if (dto.notes !== undefined) values.notes = dto.notes
    if (dto.isActive !== undefined) values.isActive = dto.isActive
    if (dto.createdBy !== undefined) values.createdBy = dto.createdBy

    return values
  }

  async getByUserId(userId: string): Promise<TSuperadminUser | null> {
    const results = await this.db
      .select()
      .from(superadminUsers)
      .where(eq(superadminUsers.userId, userId))
      .limit(1)

    if (results.length === 0) {
      return null
    }

    return this.mapToEntity(results[0])
  }

  async isUserSuperadmin(userId: string): Promise<boolean> {
    const results = await this.db
      .select()
      .from(superadminUsers)
      .where(eq(superadminUsers.userId, userId))
      .limit(1)

    if (results.length === 0) {
      return false
    }

    const superadmin = results[0]
    return superadmin?.isActive ?? false
  }

  async updateLastAccess(id: string): Promise<void> {
    await this.db
      .update(superadminUsers)
      .set({ lastAccessAt: new Date(), updatedAt: new Date() })
      .where(eq(superadminUsers.id, id))
  }

  async getActiveSuperadminUsers(): Promise<TUser[]> {
    try {
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
        .from(superadminUsers)
        .innerJoin(users, eq(superadminUsers.userId, users.id))
        .where(eq(superadminUsers.isActive, true))

      console.log('🔍 Active superadmin users found:', results.length)

      return results.map((r) => ({
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
    } catch (error) {
      console.error('🔍 Error fetching active superadmin users:', error)
      throw error
    }
  }
}
