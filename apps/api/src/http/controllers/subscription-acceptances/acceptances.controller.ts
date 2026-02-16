import type { Context } from 'hono'
import { z } from 'zod'
import type {
  SubscriptionAcceptancesRepository,
  ManagementCompanySubscriptionsRepository,
  SubscriptionAuditHistoryRepository,
} from '@database/repositories'
import { paramsValidator, bodyValidator, getParams, getBody } from '../../middlewares/utils/payload-validator'
import { createRouter } from '../create-router'
import type { TRouteDefinition } from '../types'
import { AcceptSubscriptionService, SubscriptionAuditService } from '../../../services/subscriptions'

const TokenParamSchema = z.object({
  token: z.string().min(1, 'Token is required'),
})

type TTokenParam = z.infer<typeof TokenParamSchema>

const AcceptSubscriptionBodySchema = z.object({
  userId: z.string().uuid('Invalid user ID format'),
  email: z.string().email('Invalid email format'),
})

type TAcceptSubscriptionBody = z.infer<typeof AcceptSubscriptionBodySchema>

/**
 * Controller for public subscription acceptance endpoints.
 *
 * Endpoints:
 * - GET  /subscription-accept/validate/:token   Validate acceptance token
 * - POST /subscription-accept/:token            Accept subscription
 */
export class SubscriptionAcceptancesController {
  private readonly acceptService: AcceptSubscriptionService

  constructor(
    acceptancesRepository: SubscriptionAcceptancesRepository,
    subscriptionsRepository: ManagementCompanySubscriptionsRepository,
    auditRepository: SubscriptionAuditHistoryRepository
  ) {
    const auditService = new SubscriptionAuditService(auditRepository)
    this.acceptService = new AcceptSubscriptionService(
      acceptancesRepository,
      subscriptionsRepository,
      auditService
    )

  }

  get routes(): TRouteDefinition[] {
    return [
      // Public: Validate acceptance token
      {
        method: 'get',
        path: '/subscription-accept/validate/:token',
        handler: this.validateToken,
        middlewares: [paramsValidator(TokenParamSchema)],
      },
      // Public: Accept subscription
      {
        method: 'post',
        path: '/subscription-accept/:token',
        handler: this.acceptSubscription,
        middlewares: [
          paramsValidator(TokenParamSchema),
          bodyValidator(AcceptSubscriptionBodySchema),
        ],
      },
    ]
  }

  createRouter() {
    return createRouter(this.routes)
  }

  /**
   * Validate an acceptance token (public endpoint)
   */
  private validateToken = async (c: Context): Promise<Response> => {
    const params = getParams<TTokenParam>(c)

    try {
      const result = await this.acceptService.validateToken({ token: params.token })

      if (!result.success) {
        if (result.code === 'NOT_FOUND') {
          return c.json({ success: false, error: result.error }, 404)
        }
        return c.json({ success: false, error: result.error }, 400)
      }

      // Return limited info (don't expose full acceptance data)
      return c.json({
        success: true,
        data: {
          subscriptionId: result.data.subscriptionId,
          status: result.data.status,
          expiresAt: result.data.expiresAt,
        },
      })
    } catch (error) {
      console.error('Error validating token:', error)
      return c.json({ success: false, error: 'Internal server error' }, 500)
    }
  }

  /**
   * Accept subscription using token (public endpoint)
   */
  private acceptSubscription = async (c: Context): Promise<Response> => {
    const params = getParams<TTokenParam>(c)
    const body = getBody<TAcceptSubscriptionBody>(c)

    // Get client info
    const ipAddress = c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || null
    const userAgent = c.req.header('user-agent') || null

    try {
      const result = await this.acceptService.accept({
        token: params.token,
        userId: body.userId,
        email: body.email,
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
        message: 'Subscription accepted successfully',
      })
    } catch (error) {
      console.error('Error accepting subscription:', error)
      return c.json({ success: false, error: 'Internal server error' }, 500)
    }
  }
}
