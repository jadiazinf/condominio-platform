import { eq, and, lt, desc } from 'drizzle-orm'
import type {
  TUserInvitation,
  TUserInvitationCreate,
  TUserInvitationUpdate,
  TUserInvitationStatus,
} from '@packages/domain'
import { userInvitations } from '@database/drizzle/schema'
import type { TDrizzleClient } from './interfaces'
import { BaseRepository } from './base'

type TUserInvitationRecord = typeof userInvitations.$inferSelect

/**
 * Repository for managing user invitation entities.
 * Handles the complete lifecycle of invitations sent to users
 * to join condominiums with specific roles.
 */
export class UserInvitationsRepository extends BaseRepository<
  typeof userInvitations,
  TUserInvitation,
  TUserInvitationCreate,
  TUserInvitationUpdate
> {
  constructor(db: TDrizzleClient) {
    super(db, userInvitations)
  }

  protected mapToEntity(record: unknown): TUserInvitation {
    const r = record as TUserInvitationRecord
    return {
      id: r.id,
      userId: r.userId,
      condominiumId: r.condominiumId,
      roleId: r.roleId,
      token: r.token,
      tokenHash: r.tokenHash,
      status: (r.status ?? 'pending') as TUserInvitationStatus,
      email: r.email,
      expiresAt: r.expiresAt,
      acceptedAt: r.acceptedAt,
      emailError: r.emailError,
      createdAt: r.createdAt ?? new Date(),
      updatedAt: r.updatedAt ?? new Date(),
      createdBy: r.createdBy,
    }
  }

  protected mapToInsertValues(dto: TUserInvitationCreate): Record<string, unknown> {
    return {
      userId: dto.userId,
      condominiumId: dto.condominiumId,
      roleId: dto.roleId,
      token: dto.token,
      tokenHash: dto.tokenHash,
      status: dto.status,
      email: dto.email,
      expiresAt: dto.expiresAt,
      acceptedAt: dto.acceptedAt,
      emailError: dto.emailError,
      createdBy: dto.createdBy,
    }
  }

  protected mapToUpdateValues(dto: TUserInvitationUpdate): Record<string, unknown> {
    const values: Record<string, unknown> = {}

    if (dto.status !== undefined) values.status = dto.status
    if (dto.expiresAt !== undefined) values.expiresAt = dto.expiresAt
    if (dto.acceptedAt !== undefined) values.acceptedAt = dto.acceptedAt
    if (dto.emailError !== undefined) values.emailError = dto.emailError

    return values
  }

  /**
   * Retrieves an invitation by its token hash.
   * Used for secure token validation without exposing the actual token.
   */
  async getByTokenHash(tokenHash: string): Promise<TUserInvitation | null> {
    const results = await this.db
      .select()
      .from(userInvitations)
      .where(eq(userInvitations.tokenHash, tokenHash))
      .limit(1)

    if (results.length === 0) {
      return null
    }

    return this.mapToEntity(results[0])
  }

  /**
   * Retrieves an invitation by its token (plain text).
   */
  async getByToken(token: string): Promise<TUserInvitation | null> {
    const results = await this.db
      .select()
      .from(userInvitations)
      .where(eq(userInvitations.token, token))
      .limit(1)

    if (results.length === 0) {
      return null
    }

    return this.mapToEntity(results[0])
  }

  /**
   * Retrieves all invitations for a specific user.
   */
  async getByUserId(userId: string): Promise<TUserInvitation[]> {
    const results = await this.db
      .select()
      .from(userInvitations)
      .where(eq(userInvitations.userId, userId))
      .orderBy(desc(userInvitations.createdAt))

    return results.map(r => this.mapToEntity(r))
  }

  /**
   * Retrieves all pending invitations for a specific email.
   */
  async getPendingByEmail(email: string): Promise<TUserInvitation[]> {
    const results = await this.db
      .select()
      .from(userInvitations)
      .where(and(eq(userInvitations.email, email), eq(userInvitations.status, 'pending')))
      .orderBy(desc(userInvitations.createdAt))

    return results.map(r => this.mapToEntity(r))
  }

  /**
   * Retrieves all invitations for a condominium.
   */
  async getByCondominiumId(condominiumId: string): Promise<TUserInvitation[]> {
    const results = await this.db
      .select()
      .from(userInvitations)
      .where(eq(userInvitations.condominiumId, condominiumId))
      .orderBy(desc(userInvitations.createdAt))

    return results.map(r => this.mapToEntity(r))
  }

  /**
   * Marks an invitation as accepted.
   */
  async markAsAccepted(id: string): Promise<TUserInvitation | null> {
    const now = new Date()
    const results = await this.db
      .update(userInvitations)
      .set({
        status: 'accepted',
        acceptedAt: now,
        updatedAt: now,
      })
      .where(eq(userInvitations.id, id))
      .returning()

    if (results.length === 0) {
      return null
    }

    return this.mapToEntity(results[0])
  }

  /**
   * Marks an invitation as cancelled.
   */
  async markAsCancelled(id: string): Promise<TUserInvitation | null> {
    const results = await this.db
      .update(userInvitations)
      .set({
        status: 'cancelled',
        updatedAt: new Date(),
      })
      .where(eq(userInvitations.id, id))
      .returning()

    if (results.length === 0) {
      return null
    }

    return this.mapToEntity(results[0])
  }

  /**
   * Marks all expired pending invitations as expired.
   * This should be called periodically by a cron job.
   */
  async markExpiredInvitations(): Promise<number> {
    const now = new Date()
    const results = await this.db
      .update(userInvitations)
      .set({
        status: 'expired',
        updatedAt: now,
      })
      .where(and(eq(userInvitations.status, 'pending'), lt(userInvitations.expiresAt, now)))
      .returning()

    return results.length
  }

  /**
   * Records an email sending error for an invitation.
   */
  async recordEmailError(id: string, error: string): Promise<TUserInvitation | null> {
    const results = await this.db
      .update(userInvitations)
      .set({
        emailError: error,
        updatedAt: new Date(),
      })
      .where(eq(userInvitations.id, id))
      .returning()

    if (results.length === 0) {
      return null
    }

    return this.mapToEntity(results[0])
  }

  /**
   * Regenerates the token for an invitation.
   * This is used when resending the invitation email.
   */
  async regenerateToken(
    id: string,
    newToken: string,
    newTokenHash: string
  ): Promise<TUserInvitation | null> {
    const results = await this.db
      .update(userInvitations)
      .set({
        token: newToken,
        tokenHash: newTokenHash,
        emailError: null,
        updatedAt: new Date(),
      })
      .where(eq(userInvitations.id, id))
      .returning()

    if (results.length === 0) {
      return null
    }

    return this.mapToEntity(results[0])
  }

  /**
   * Checks if a valid pending invitation exists for a user and condominium.
   */
  async hasPendingInvitation(userId: string, condominiumId: string | null): Promise<boolean> {
    const now = new Date()

    const whereConditions = condominiumId
      ? and(
          eq(userInvitations.userId, userId),
          eq(userInvitations.condominiumId, condominiumId),
          eq(userInvitations.status, 'pending')
        )
      : and(eq(userInvitations.userId, userId), eq(userInvitations.status, 'pending'))

    const results = await this.db
      .select()
      .from(userInvitations)
      .where(whereConditions)
      .limit(1)

    const invitation = results[0]
    if (!invitation) {
      return false
    }

    return invitation.expiresAt > now
  }
}
