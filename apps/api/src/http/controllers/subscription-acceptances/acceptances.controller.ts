import type { Context } from 'hono'
import { z } from 'zod'
import type {
  SubscriptionAcceptancesRepository,
  ManagementCompanySubscriptionsRepository,
  SubscriptionAuditHistoryRepository,
  ManagementCompanyMembersRepository,
} from '@database/repositories'
import { paramsValidator, getParams } from '../../middlewares/utils/payload-validator'
import { authMiddleware } from '../../middlewares/auth'
import { AUTHENTICATED_USER_PROP } from '../../middlewares/utils/auth/is-user-authenticated'
import { createRouter } from '../create-router'
import type { TRouteDefinition } from '../types'
import { AcceptSubscriptionService, SubscriptionAuditService } from '../../../services/subscriptions'

const TokenParamSchema = z.object({
  token: z.string().min(1, 'Token is required'),
})

type TTokenParam = z.infer<typeof TokenParamSchema>

/**
 * Controller for subscription acceptance endpoints.
 *
 * Both endpoints require authentication and verify the user is the
 * primary admin of the management company that owns the subscription.
 *
 * Endpoints:
 * - GET  /subscription-accept/validate/:token   Validate token + authorization check
 * - POST /subscription-accept/:token            Accept subscription
 */
export class SubscriptionAcceptancesController {
  private readonly acceptService: AcceptSubscriptionService
  private readonly membersRepository: ManagementCompanyMembersRepository

  constructor(
    acceptancesRepository: SubscriptionAcceptancesRepository,
    subscriptionsRepository: ManagementCompanySubscriptionsRepository,
    auditRepository: SubscriptionAuditHistoryRepository,
    membersRepository: ManagementCompanyMembersRepository
  ) {
    const auditService = new SubscriptionAuditService(auditRepository)
    this.acceptService = new AcceptSubscriptionService(
      acceptancesRepository,
      subscriptionsRepository,
      auditService
    )
    this.membersRepository = membersRepository
  }

  get routes(): TRouteDefinition[] {
    return [
      // Authenticated: Validate acceptance token (primary admin only)
      {
        method: 'get',
        path: '/subscription-accept/validate/:token',
        handler: this.validateToken,
        middlewares: [authMiddleware, paramsValidator(TokenParamSchema)],
      },
      // Authenticated: Accept subscription (primary admin only)
      {
        method: 'post',
        path: '/subscription-accept/:token',
        handler: this.acceptSubscription,
        middlewares: [authMiddleware, paramsValidator(TokenParamSchema)],
      },
    ]
  }

  createRouter() {
    return createRouter(this.routes)
  }

  /**
   * Validate token and verify the user is the primary admin.
   * Returns 403 if the user is not authorized.
   */
  private validateAndAuthorize = async (token: string, userId: string) => {
    const result = await this.acceptService.validateToken({ token })

    if (!result.success) {
      return { authorized: false as const, tokenResult: result }
    }

    const acceptance = result.data
    const subscription = await this.acceptService.getSubscriptionById(acceptance.subscriptionId)

    if (!subscription) {
      return { authorized: false as const, tokenResult: { success: false as const, error: 'Subscription not found', code: 'NOT_FOUND' } }
    }

    const primaryAdmin = await this.membersRepository.getPrimaryAdmin(subscription.managementCompanyId)

    if (!primaryAdmin || primaryAdmin.userId !== userId) {
      return { authorized: false as const, forbidden: true as const }
    }

    return { authorized: true as const, acceptance, subscription, tokenResult: result }
  }

  /**
   * Validate an acceptance token (authenticated, primary admin only)
   */
  private validateToken = async (c: Context): Promise<Response> => {
    const params = getParams<TTokenParam>(c)
    const user = c.get(AUTHENTICATED_USER_PROP)

    try {
      const auth = await this.validateAndAuthorize(params.token, user.id)

      if ('forbidden' in auth) {
        return c.json(
          { success: false, error: 'Solo el administrador principal de la empresa puede acceder a este enlace' },
          403
        )
      }

      if (!auth.authorized) {
        const code = auth.tokenResult.code
        if (code === 'NOT_FOUND') {
          return c.json({ success: false, error: auth.tokenResult.error }, 404)
        }
        return c.json({ success: false, error: auth.tokenResult.error }, 400)
      }

      return c.json({
        success: true,
        data: {
          subscriptionId: auth.acceptance.subscriptionId,
          status: auth.acceptance.status,
          expiresAt: auth.acceptance.expiresAt,
        },
      })
    } catch (error) {
      console.error('Error validating token:', error)
      return c.json({ success: false, error: 'Internal server error' }, 500)
    }
  }

  /**
   * Accept subscription using token (authenticated, primary admin only)
   */
  private acceptSubscription = async (c: Context): Promise<Response> => {
    const params = getParams<TTokenParam>(c)
    const user = c.get(AUTHENTICATED_USER_PROP)

    const ipAddress = c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || null
    const userAgent = c.req.header('user-agent') || null

    try {
      const auth = await this.validateAndAuthorize(params.token, user.id)

      if ('forbidden' in auth) {
        return c.json(
          { success: false, error: 'Solo el administrador principal de la empresa puede aceptar la suscripción' },
          403
        )
      }

      if (!auth.authorized) {
        const code = auth.tokenResult.code
        if (code === 'NOT_FOUND') {
          return c.json({ success: false, error: auth.tokenResult.error }, 404)
        }
        return c.json({ success: false, error: auth.tokenResult.error }, 400)
      }

      const result = await this.acceptService.accept({
        token: params.token,
        userId: user.id,
        email: user.email,
        ipAddress,
        userAgent,
      })

      if (!result.success) {
        if (result.code === 'NOT_FOUND') {
          return c.json({ success: false, error: result.error }, 404)
        }
        return c.json({ success: false, error: result.error }, 400)
      }

      return c.json({
        success: true,
        data: {
          subscription: {
            id: result.data.subscription.id,
            status: result.data.subscription.status,
            startDate: result.data.subscription.startDate,
          },
          acceptance: {
            id: result.data.acceptance.id,
            status: result.data.acceptance.status,
            acceptedAt: result.data.acceptance.acceptedAt,
          },
        },
      })
    } catch (error) {
      console.error('Error accepting subscription:', error)
      return c.json({ success: false, error: 'Internal server error' }, 500)
    }
  }
}
