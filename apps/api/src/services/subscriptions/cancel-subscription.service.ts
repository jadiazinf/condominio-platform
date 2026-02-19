import type { TManagementCompanySubscription } from '@packages/domain'
import type {
  ManagementCompanySubscriptionsRepository,
  ManagementCompanyMembersRepository,
  ManagementCompaniesRepository,
  UsersRepository,
} from '@database/repositories'
import type { TDrizzleClient } from '@database/repositories/interfaces'
import { type TServiceResult, success, failure } from '../base.service'
import type { SendSubscriptionCancellationEmailService } from '../email'
import { users, userRoles, roles } from '@database/drizzle/schema'
import { eq, and, isNull } from 'drizzle-orm'
import logger from '@utils/logger'
import { ESystemRole } from '@packages/domain'

export interface ICancelSubscriptionInput {
  subscriptionId: string
  cancelledBy: string
  cancellationReason?: string
}

interface IOptionalDependencies {
  membersRepository?: ManagementCompanyMembersRepository
  companiesRepository?: ManagementCompaniesRepository
  usersRepository?: UsersRepository
  emailService?: SendSubscriptionCancellationEmailService
  db?: TDrizzleClient
}

interface ISuperadminUser {
  id: string
  email: string
  displayName: string | null
  firstName: string | null
  lastName: string | null
}

/**
 * Service for cancelling a subscription.
 * Sets status to 'cancelled' and records cancellation details.
 * Optionally sends notification emails to:
 * - Main superuser
 * - Company email
 * - Primary admin
 */
export class CancelSubscriptionService {
  private readonly membersRepository?: ManagementCompanyMembersRepository
  private readonly companiesRepository?: ManagementCompaniesRepository
  private readonly usersRepository?: UsersRepository
  private readonly emailService?: SendSubscriptionCancellationEmailService
  private readonly db?: TDrizzleClient

  constructor(
    private readonly subscriptionsRepository: ManagementCompanySubscriptionsRepository,
    optionalDeps?: IOptionalDependencies
  ) {
    if (optionalDeps) {
      this.membersRepository = optionalDeps.membersRepository
      this.companiesRepository = optionalDeps.companiesRepository
      this.usersRepository = optionalDeps.usersRepository
      this.emailService = optionalDeps.emailService
      this.db = optionalDeps.db
    }
  }

  private hasEmailDependencies(): boolean {
    return !!(
      this.membersRepository &&
      this.companiesRepository &&
      this.usersRepository &&
      this.emailService &&
      this.db
    )
  }

  /**
   * Get the first active superadmin user
   */
  private async getMainSuperadmin(): Promise<ISuperadminUser | null> {
    if (!this.db) return null


    try {
      const results = await this.db
        .select({
          id: users.id,
          email: users.email,
          displayName: users.displayName,
          firstName: users.firstName,
          lastName: users.lastName,
        })
        .from(users)
        .innerJoin(userRoles, eq(users.id, userRoles.userId))
        .innerJoin(roles, eq(userRoles.roleId, roles.id))
        .where(
          and(
            eq(roles.name, ESystemRole.SUPERADMIN),
            eq(users.isActive, true),
            eq(userRoles.isActive, true),
            isNull(userRoles.condominiumId),
            isNull(userRoles.buildingId)
          )
        )
        .limit(1)

      return results[0] ?? null
    } catch (error) {
      logger.error({ error }, 'Failed to get main superadmin')
      return null
    }
  }

  async execute(input: ICancelSubscriptionInput): Promise<TServiceResult<TManagementCompanySubscription>> {
    // Check if subscription exists
    const existing = await this.subscriptionsRepository.getById(input.subscriptionId)

    if (!existing) {
      return failure('Subscription not found', 'NOT_FOUND')
    }

    // Check if already cancelled
    if (existing.status === 'cancelled') {
      return failure('Subscription is already cancelled', 'BAD_REQUEST')
    }

    const cancelledAt = new Date()

    // Update subscription to cancelled status
    const cancelled = await this.subscriptionsRepository.update(input.subscriptionId, {
      status: 'cancelled',
      cancelledAt,
      cancelledBy: input.cancelledBy,
      cancellationReason: input.cancellationReason ?? null,
      autoRenew: false,
    })

    if (!cancelled) {
      return failure('Failed to cancel subscription', 'INTERNAL_ERROR')
    }

    // Send notification emails if dependencies are available
    if (this.hasEmailDependencies()) {
      await this.sendCancellationEmails(cancelled, input.cancelledBy, cancelledAt, input.cancellationReason)
    }

    return success(cancelled)
  }

  private async sendCancellationEmails(
    subscription: TManagementCompanySubscription,
    cancelledById: string,
    cancelledAt: Date,
    cancellationReason?: string
  ): Promise<void> {
    try {
      // Get company details
      const company = await this.companiesRepository!.getById(subscription.managementCompanyId)
      if (!company) {
        logger.warn({ companyId: subscription.managementCompanyId }, 'Company not found for cancellation email')
        return
      }

      // Get the user who cancelled
      const cancelledByUser = await this.usersRepository!.getById(cancelledById)
      const cancelledByName = cancelledByUser
        ? cancelledByUser.displayName ||
          [cancelledByUser.firstName, cancelledByUser.lastName].filter(Boolean).join(' ') ||
          cancelledByUser.email
        : 'Usuario desconocido'

      // Prepare common email data
      const emailData = {
        companyName: company.name,
        subscriptionName: subscription.subscriptionName || 'Plan personalizado',
        basePrice: subscription.basePrice,
        billingCycle: subscription.billingCycle,
        cancelledByName,
        cancellationReason,
        cancelledAt,
      }

      const emailsSent: string[] = []

      // 1. Send to main superadmin
      const mainSuperadmin = await this.getMainSuperadmin()
      if (mainSuperadmin) {
        const superadminName =
          mainSuperadmin.displayName ||
          [mainSuperadmin.firstName, mainSuperadmin.lastName].filter(Boolean).join(' ') ||
          'Administrador'

        const result = await this.emailService!.execute({
          to: mainSuperadmin.email,
          recipientName: superadminName,
          ...emailData,
        })

        if (result.success) {
          emailsSent.push(mainSuperadmin.email)
        }
      }

      // 2. Send to company email
      if (company.email) {
        const result = await this.emailService!.execute({
          to: company.email,
          recipientName: company.name,
          ...emailData,
        })

        if (result.success) {
          emailsSent.push(company.email)
        }
      }

      // 3. Send to primary admin
      const primaryAdmin = await this.membersRepository!.getPrimaryAdmin(subscription.managementCompanyId)
      if (primaryAdmin) {
        const primaryAdminUser = await this.usersRepository!.getById(primaryAdmin.userId)
        if (primaryAdminUser) {
          const adminName =
            primaryAdminUser.displayName ||
            [primaryAdminUser.firstName, primaryAdminUser.lastName].filter(Boolean).join(' ') ||
            'Administrador'

          const result = await this.emailService!.execute({
            to: primaryAdminUser.email,
            recipientName: adminName,
            ...emailData,
          })

          if (result.success) {
            emailsSent.push(primaryAdminUser.email)
          }
        }
      }

      logger.info(
        { subscriptionId: subscription.id, emailsSent },
        'Cancellation notification emails sent'
      )
    } catch (error) {
      // Log error but don't fail the cancellation
      logger.error({ error, subscriptionId: subscription.id }, 'Failed to send cancellation emails')
    }
  }
}
