import type {
  TManagementCompanySubscription,
  TManagementCompanySubscriptionCreate,
  TSubscriptionAcceptance,
} from '@packages/domain'
import type {
  ManagementCompanySubscriptionsRepository,
  ManagementCompanyMembersRepository,
  ManagementCompaniesRepository,
  SubscriptionAcceptancesRepository,
  SubscriptionTermsConditionsRepository,
  UsersRepository,
} from '@database/repositories'
import { type TServiceResult, success, failure } from '../base.service'
import { AcceptSubscriptionService } from './accept-subscription.service'
import type { SubscriptionAuditService } from './subscription-audit.service'
import type { SendSubscriptionAcceptanceEmailService } from '../email'

export interface ICreateSubscriptionInput extends Omit<TManagementCompanySubscriptionCreate, 'status'> {
  status?: TManagementCompanySubscriptionCreate['status']
}

export interface ICreateSubscriptionContext {
  ipAddress?: string
  userAgent?: string
}

export interface ICreateSubscriptionResult {
  subscription: TManagementCompanySubscription
  acceptance?: TSubscriptionAcceptance
  emailsSent?: string[]
}

// Optional dependencies for the full acceptance workflow
interface IOptionalDependencies {
  membersRepository?: ManagementCompanyMembersRepository
  companiesRepository?: ManagementCompaniesRepository
  acceptancesRepository?: SubscriptionAcceptancesRepository
  termsRepository?: SubscriptionTermsConditionsRepository
  usersRepository?: UsersRepository
  auditService?: SubscriptionAuditService
  emailService?: SendSubscriptionAcceptanceEmailService
}

/**
 * Service for creating a new subscription for a management company.
 *
 * Basic mode (subscriptionsRepository only):
 * - Creates subscription directly with provided status
 *
 * Full acceptance workflow (all dependencies provided):
 * 1. Validates company has at least one active member
 * 2. Gets active terms & conditions
 * 3. Creates subscription with 'inactive' status
 * 4. Generates acceptance token
 * 5. Creates acceptance record
 * 6. Logs audit entry
 * 7. Sends acceptance emails to company and primary admin
 */
export class CreateSubscriptionService {
  private readonly membersRepository?: ManagementCompanyMembersRepository
  private readonly companiesRepository?: ManagementCompaniesRepository
  private readonly acceptancesRepository?: SubscriptionAcceptancesRepository
  private readonly termsRepository?: SubscriptionTermsConditionsRepository
  private readonly usersRepository?: UsersRepository
  private readonly auditService?: SubscriptionAuditService
  private readonly emailService?: SendSubscriptionAcceptanceEmailService

  constructor(
    private readonly subscriptionsRepository: ManagementCompanySubscriptionsRepository,
    optionalDeps?: IOptionalDependencies
  ) {
    if (optionalDeps) {
      this.membersRepository = optionalDeps.membersRepository
      this.companiesRepository = optionalDeps.companiesRepository
      this.acceptancesRepository = optionalDeps.acceptancesRepository
      this.termsRepository = optionalDeps.termsRepository
      this.usersRepository = optionalDeps.usersRepository
      this.auditService = optionalDeps.auditService
      this.emailService = optionalDeps.emailService
    }
  }

  private hasFullDependencies(): boolean {
    return !!(
      this.membersRepository &&
      this.companiesRepository &&
      this.acceptancesRepository &&
      this.termsRepository &&
      this.usersRepository &&
      this.auditService &&
      this.emailService
    )
  }

  async execute(
    input: ICreateSubscriptionInput,
    context?: ICreateSubscriptionContext
  ): Promise<TServiceResult<ICreateSubscriptionResult>> {
    const companyId = input.managementCompanyId

    // 1. Check if there's already an active or trial subscription
    const existingSubscription = await this.subscriptionsRepository.getActiveByCompanyId(companyId)

    if (existingSubscription) {
      return failure(
        `Management company already has an ${existingSubscription.status} subscription`,
        'CONFLICT'
      )
    }

    // If we don't have full dependencies, use basic flow
    if (!this.hasFullDependencies()) {
      return this.executeBasicFlow(input)
    }

    // Full acceptance workflow
    // 2. Get management company details
    const company = await this.companiesRepository!.getById(companyId)

    if (!company) {
      return failure('Management company not found', 'NOT_FOUND')
    }

    // 3. Validate company has at least one active member
    const members = await this.membersRepository!.listByCompanyId(companyId, false)

    if (members.length === 0) {
      return failure(
        'Cannot create subscription: management company has no active members',
        'BAD_REQUEST'
      )
    }

    // 4. Get primary admin
    const primaryAdmin = await this.membersRepository!.getPrimaryAdmin(companyId)

    if (!primaryAdmin) {
      return failure(
        'Cannot create subscription: management company has no primary admin',
        'BAD_REQUEST'
      )
    }

    // Get primary admin user details
    const primaryAdminUser = await this.usersRepository!.getById(primaryAdmin.userId)

    if (!primaryAdminUser) {
      return failure('Primary admin user not found', 'NOT_FOUND')
    }

    // 5. Get active terms & conditions
    const activeTerms = await this.termsRepository!.getActiveTerms()

    if (!activeTerms) {
      return failure(
        'Cannot create subscription: no active terms and conditions found',
        'BAD_REQUEST'
      )
    }

    // 6. Create subscription with 'inactive' status (always starts inactive)
    const subscriptionData: TManagementCompanySubscriptionCreate = {
      ...input,
      status: 'inactive', // Always starts inactive until accepted
    }

    const subscription = await this.subscriptionsRepository.create(subscriptionData)

    // 7. Generate acceptance token
    const { token, tokenHash } = AcceptSubscriptionService.generateToken()

    // Calculate expiration (7 days from now)
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    // 8. Create acceptance record
    const acceptance = await this.acceptancesRepository!.create({
      subscriptionId: subscription.id,
      termsConditionsId: activeTerms.id,
      token,
      tokenHash,
      status: 'pending',
      expiresAt,
      acceptedBy: null,
      acceptedAt: null,
      acceptorEmail: null,
      ipAddress: context?.ipAddress ?? null,
      userAgent: context?.userAgent ?? null,
    })

    // 9. Log audit entry
    await this.auditService!.logCreation(subscription, input.createdBy, {
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
    })

    // 10. Send acceptance emails
    const emailsSent: string[] = []

    // Prepare email data
    const emailData = {
      subscriptionName: subscription.subscriptionName || 'Plan personalizado',
      basePrice: subscription.basePrice,
      billingCycle: subscription.billingCycle,
      startDate: subscription.startDate,
      pricingDetails: subscription.pricingCondominiumCount || subscription.pricingUnitCount
        ? {
            condominiumCount: subscription.pricingCondominiumCount,
            unitCount: subscription.pricingUnitCount,
            condominiumRate: subscription.pricingCondominiumRate,
            unitRate: subscription.pricingUnitRate,
            calculatedPrice: subscription.calculatedPrice,
            discountType: subscription.discountType,
            discountValue: subscription.discountValue,
            discountAmount: subscription.discountAmount,
          }
        : undefined,
      termsContent: activeTerms.content,
      termsVersion: activeTerms.version,
      acceptanceToken: token,
      expiresAt,
    }

    // Send to company email if available
    if (company.email) {
      const companyEmailResult = await this.emailService!.execute({
        to: company.email,
        recipientName: company.name,
        companyName: company.name,
        ...emailData,
      })

      if (companyEmailResult.success) {
        emailsSent.push(company.email)
      }
    }

    // Send to primary admin email
    const adminName = primaryAdminUser.displayName ||
      [primaryAdminUser.firstName, primaryAdminUser.lastName].filter(Boolean).join(' ') ||
      'Administrador'

    const adminEmailResult = await this.emailService!.execute({
      to: primaryAdminUser.email,
      recipientName: adminName,
      companyName: company.name,
      ...emailData,
    })

    if (adminEmailResult.success) {
      emailsSent.push(primaryAdminUser.email)
    }

    return success({
      subscription,
      acceptance,
      emailsSent,
    })
  }

  /**
   * Basic flow: Just create the subscription without acceptance workflow.
   * Used when optional dependencies are not provided.
   */
  private async executeBasicFlow(
    input: ICreateSubscriptionInput
  ): Promise<TServiceResult<ICreateSubscriptionResult>> {
    // Create subscription with provided status
    const subscriptionData: TManagementCompanySubscriptionCreate = {
      ...input,
      status: input.status ?? 'inactive',
    }

    const subscription = await this.subscriptionsRepository.create(subscriptionData)

    return success({
      subscription,
    })
  }
}
