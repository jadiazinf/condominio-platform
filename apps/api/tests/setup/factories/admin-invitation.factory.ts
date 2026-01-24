import { faker } from '@faker-js/faker'
import type { TAdminInvitationCreate } from '@packages/domain'
import { generateSecureToken, hashToken, calculateExpirationDate } from '@src/utils/token'

/**
 * Factory for creating admin invitation test data.
 */
export class AdminInvitationFactory {
  /**
   * Creates fake data for an admin invitation.
   */
  static create(overrides: Partial<TAdminInvitationCreate> = {}): TAdminInvitationCreate {
    const token = generateSecureToken()
    return {
      userId: faker.string.uuid(),
      managementCompanyId: faker.string.uuid(),
      token,
      tokenHash: hashToken(token),
      status: 'pending',
      email: faker.internet.email(),
      expiresAt: calculateExpirationDate(7),
      acceptedAt: null,
      emailError: null,
      createdBy: null,
      ...overrides,
    }
  }

  /**
   * Creates fake data for a pending invitation.
   */
  static pending(overrides: Partial<TAdminInvitationCreate> = {}): TAdminInvitationCreate {
    return this.create({
      status: 'pending',
      acceptedAt: null,
      ...overrides,
    })
  }

  /**
   * Creates fake data for an accepted invitation.
   */
  static accepted(overrides: Partial<TAdminInvitationCreate> = {}): TAdminInvitationCreate {
    return this.create({
      status: 'accepted',
      acceptedAt: new Date(),
      ...overrides,
    })
  }

  /**
   * Creates fake data for an expired invitation.
   */
  static expired(overrides: Partial<TAdminInvitationCreate> = {}): TAdminInvitationCreate {
    const pastDate = new Date()
    pastDate.setDate(pastDate.getDate() - 10)
    return this.create({
      status: 'expired',
      expiresAt: pastDate,
      ...overrides,
    })
  }

  /**
   * Creates fake data for a cancelled invitation.
   */
  static cancelled(overrides: Partial<TAdminInvitationCreate> = {}): TAdminInvitationCreate {
    return this.create({
      status: 'cancelled',
      ...overrides,
    })
  }

  /**
   * Creates fake data for an invitation with specific user.
   */
  static forUser(userId: string, overrides: Partial<TAdminInvitationCreate> = {}): TAdminInvitationCreate {
    return this.create({
      userId,
      ...overrides,
    })
  }

  /**
   * Creates fake data for an invitation with specific company.
   */
  static forCompany(
    managementCompanyId: string,
    overrides: Partial<TAdminInvitationCreate> = {}
  ): TAdminInvitationCreate {
    return this.create({
      managementCompanyId,
      ...overrides,
    })
  }

  /**
   * Creates fake data for an invitation with known token (for testing validation).
   */
  static withToken(
    token: string,
    overrides: Partial<TAdminInvitationCreate> = {}
  ): TAdminInvitationCreate {
    return this.create({
      token,
      tokenHash: hashToken(token),
      ...overrides,
    })
  }
}
