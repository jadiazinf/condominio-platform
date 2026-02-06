import crypto from 'crypto'
import type { TSubscriptionAcceptance, TManagementCompanySubscription } from '@packages/domain'
import type { SubscriptionAcceptancesRepository, ManagementCompanySubscriptionsRepository } from '@database/repositories'
import { type TServiceResult, success, failure } from '../base.service'
import type { SubscriptionAuditService } from './subscription-audit.service'

export interface IValidateAcceptanceTokenInput {
  token: string
}

export interface IAcceptSubscriptionInput {
  token: string
  userId: string
  email: string
  ipAddress?: string | null
  userAgent?: string | null
}

export interface IAcceptSubscriptionResult {
  acceptance: TSubscriptionAcceptance
  subscription: TManagementCompanySubscription
}

/**
 * Service for handling subscription acceptance workflow.
 * Validates tokens and activates subscriptions upon acceptance.
 */
export class AcceptSubscriptionService {
  constructor(
    private readonly acceptancesRepository: SubscriptionAcceptancesRepository,
    private readonly subscriptionsRepository: ManagementCompanySubscriptionsRepository,
    private readonly auditService: SubscriptionAuditService
  ) {}

  /**
   * Validate an acceptance token
   */
  async validateToken(input: IValidateAcceptanceTokenInput): Promise<TServiceResult<TSubscriptionAcceptance>> {
    const tokenHash = this.hashToken(input.token)
    const acceptance = await this.acceptancesRepository.getByTokenHash(tokenHash)

    if (!acceptance) {
      return failure('Invalid or expired acceptance token', 'NOT_FOUND')
    }

    if (acceptance.status !== 'pending') {
      return failure(`Acceptance has already been ${acceptance.status}`, 'BAD_REQUEST')
    }

    if (new Date() > acceptance.expiresAt) {
      // Mark as expired
      await this.acceptancesRepository.markAsExpired(acceptance.id)
      return failure('Acceptance token has expired', 'BAD_REQUEST')
    }

    return success(acceptance)
  }

  /**
   * Accept a subscription using a valid token
   */
  async accept(input: IAcceptSubscriptionInput): Promise<TServiceResult<IAcceptSubscriptionResult>> {
    // Validate token first
    const validationResult = await this.validateToken({ token: input.token })

    if (!validationResult.success) {
      return failure(validationResult.error, validationResult.code)
    }

    const acceptance = validationResult.data

    // Get the subscription
    const subscription = await this.subscriptionsRepository.getById(acceptance.subscriptionId)

    if (!subscription) {
      return failure('Subscription not found', 'NOT_FOUND')
    }

    // Mark acceptance as accepted
    const updatedAcceptance = await this.acceptancesRepository.markAsAccepted(
      acceptance.id,
      input.userId,
      input.email,
      input.ipAddress ?? null,
      input.userAgent ?? null
    )

    if (!updatedAcceptance) {
      return failure('Failed to update acceptance record', 'INTERNAL_ERROR')
    }

    // Activate the subscription
    const updatedSubscription = await this.subscriptionsRepository.updateStatus(subscription.id, 'active')

    if (!updatedSubscription) {
      return failure('Failed to activate subscription', 'INTERNAL_ERROR')
    }

    // Log the terms acceptance in audit history
    await this.auditService.logTermsAcceptance(
      subscription.id,
      input.userId,
      acceptance.termsConditionsId,
      { ipAddress: input.ipAddress ?? undefined, userAgent: input.userAgent ?? undefined }
    )

    return success({
      acceptance: updatedAcceptance,
      subscription: updatedSubscription,
    })
  }

  /**
   * Generate a secure token for acceptance
   */
  static generateToken(): { token: string; tokenHash: string } {
    const token = crypto.randomBytes(32).toString('hex')
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
    return { token, tokenHash }
  }

  /**
   * Hash a token for secure comparison
   */
  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex')
  }

  /**
   * Timing-safe token comparison
   */
  static verifyToken(providedToken: string, storedHash: string): boolean {
    const providedHash = crypto.createHash('sha256').update(providedToken).digest('hex')
    return crypto.timingSafeEqual(
      Uint8Array.from(Buffer.from(providedHash)),
      Uint8Array.from(Buffer.from(storedHash))
    )
  }
}
