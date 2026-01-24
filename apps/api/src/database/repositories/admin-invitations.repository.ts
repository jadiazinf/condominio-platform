import { eq, and, lt, desc } from 'drizzle-orm'
import type {
  TAdminInvitation,
  TAdminInvitationCreate,
  TAdminInvitationUpdate,
  TAdminInvitationStatus,
} from '@packages/domain'
import { adminInvitations } from '@database/drizzle/schema'
import type { TDrizzleClient } from './interfaces'
import { BaseRepository } from './base'

type TAdminInvitationRecord = typeof adminInvitations.$inferSelect

/**
 * Repository for managing admin invitation entities.
 * Handles the complete lifecycle of invitations sent to users
 * to become administrators of management companies.
 */
export class AdminInvitationsRepository extends BaseRepository<
  typeof adminInvitations,
  TAdminInvitation,
  TAdminInvitationCreate,
  TAdminInvitationUpdate
> {
  constructor(db: TDrizzleClient) {
    super(db, adminInvitations)
  }

  protected mapToEntity(record: unknown): TAdminInvitation {
    const r = record as TAdminInvitationRecord
    return {
      id: r.id,
      userId: r.userId,
      managementCompanyId: r.managementCompanyId,
      token: r.token,
      tokenHash: r.tokenHash,
      status: (r.status ?? 'pending') as TAdminInvitationStatus,
      email: r.email,
      expiresAt: r.expiresAt,
      acceptedAt: r.acceptedAt,
      emailError: r.emailError,
      createdAt: r.createdAt ?? new Date(),
      updatedAt: r.updatedAt ?? new Date(),
      createdBy: r.createdBy,
    }
  }

  protected mapToInsertValues(dto: TAdminInvitationCreate): Record<string, unknown> {
    return {
      userId: dto.userId,
      managementCompanyId: dto.managementCompanyId,
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

  protected mapToUpdateValues(dto: TAdminInvitationUpdate): Record<string, unknown> {
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
  async getByTokenHash(tokenHash: string): Promise<TAdminInvitation | null> {
    const results = await this.db
      .select()
      .from(adminInvitations)
      .where(eq(adminInvitations.tokenHash, tokenHash))
      .limit(1)

    if (results.length === 0) {
      return null
    }

    return this.mapToEntity(results[0])
  }

  /**
   * Retrieves an invitation by its token (plain text).
   * The token should be hashed before storage, but this method
   * is useful during the validation flow.
   */
  async getByToken(token: string): Promise<TAdminInvitation | null> {
    const results = await this.db
      .select()
      .from(adminInvitations)
      .where(eq(adminInvitations.token, token))
      .limit(1)

    if (results.length === 0) {
      return null
    }

    return this.mapToEntity(results[0])
  }

  /**
   * Retrieves all invitations for a specific user.
   */
  async getByUserId(userId: string): Promise<TAdminInvitation[]> {
    const results = await this.db
      .select()
      .from(adminInvitations)
      .where(eq(adminInvitations.userId, userId))
      .orderBy(desc(adminInvitations.createdAt))

    return results.map(r => this.mapToEntity(r))
  }

  /**
   * Retrieves all pending invitations for a specific email.
   */
  async getPendingByEmail(email: string): Promise<TAdminInvitation[]> {
    const results = await this.db
      .select()
      .from(adminInvitations)
      .where(
        and(eq(adminInvitations.email, email), eq(adminInvitations.status, 'pending'))
      )
      .orderBy(desc(adminInvitations.createdAt))

    return results.map(r => this.mapToEntity(r))
  }

  /**
   * Retrieves all invitations for a management company.
   */
  async getByManagementCompanyId(managementCompanyId: string): Promise<TAdminInvitation[]> {
    const results = await this.db
      .select()
      .from(adminInvitations)
      .where(eq(adminInvitations.managementCompanyId, managementCompanyId))
      .orderBy(desc(adminInvitations.createdAt))

    return results.map(r => this.mapToEntity(r))
  }

  /**
   * Marks an invitation as accepted.
   */
  async markAsAccepted(id: string): Promise<TAdminInvitation | null> {
    const now = new Date()
    const results = await this.db
      .update(adminInvitations)
      .set({
        status: 'accepted',
        acceptedAt: now,
        updatedAt: now,
      })
      .where(eq(adminInvitations.id, id))
      .returning()

    if (results.length === 0) {
      return null
    }

    return this.mapToEntity(results[0])
  }

  /**
   * Marks an invitation as cancelled.
   */
  async markAsCancelled(id: string): Promise<TAdminInvitation | null> {
    const results = await this.db
      .update(adminInvitations)
      .set({
        status: 'cancelled',
        updatedAt: new Date(),
      })
      .where(eq(adminInvitations.id, id))
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
      .update(adminInvitations)
      .set({
        status: 'expired',
        updatedAt: now,
      })
      .where(
        and(eq(adminInvitations.status, 'pending'), lt(adminInvitations.expiresAt, now))
      )
      .returning()

    return results.length
  }

  /**
   * Records an email sending error for an invitation.
   */
  async recordEmailError(id: string, error: string): Promise<TAdminInvitation | null> {
    const results = await this.db
      .update(adminInvitations)
      .set({
        emailError: error,
        updatedAt: new Date(),
      })
      .where(eq(adminInvitations.id, id))
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
  ): Promise<TAdminInvitation | null> {
    const results = await this.db
      .update(adminInvitations)
      .set({
        token: newToken,
        tokenHash: newTokenHash,
        emailError: null,
        updatedAt: new Date(),
      })
      .where(eq(adminInvitations.id, id))
      .returning()

    if (results.length === 0) {
      return null
    }

    return this.mapToEntity(results[0])
  }

  /**
   * Checks if a valid pending invitation exists for a user and management company.
   */
  async hasPendingInvitation(userId: string, managementCompanyId: string): Promise<boolean> {
    const now = new Date()
    const results = await this.db
      .select()
      .from(adminInvitations)
      .where(
        and(
          eq(adminInvitations.userId, userId),
          eq(adminInvitations.managementCompanyId, managementCompanyId),
          eq(adminInvitations.status, 'pending')
        )
      )
      .limit(1)

    const invitation = results[0]
    if (!invitation) {
      return false
    }

    return invitation.expiresAt > now
  }
}
