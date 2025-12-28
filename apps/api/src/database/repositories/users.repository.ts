import { eq } from 'drizzle-orm'
import type { TUser, TUserCreate, TUserUpdate } from '@packages/domain'
import { users } from '@database/drizzle/schema'
import type { TDrizzleClient, IRepository } from './interfaces'
import { BaseRepository } from './base'

type TUserRecord = typeof users.$inferSelect

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
}
