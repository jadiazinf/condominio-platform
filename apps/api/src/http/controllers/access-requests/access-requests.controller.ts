import type { Context } from 'hono'
import { accessRequestReviewSchema, ESystemRole, type TUser, type TAccessRequestReview } from '@packages/domain'
import type { AccessRequestsRepository } from '@database/repositories'
import {
  NotificationsRepository,
  NotificationDeliveriesRepository,
  UserNotificationPreferencesRepository,
  UserFcmTokensRepository,
} from '@database/repositories'
import type { TDrizzleClient } from '@database/repositories/interfaces'
import { bodyValidator, paramsValidator } from '../../middlewares/utils/payload-validator'
import { authMiddleware, requireRole, CONDOMINIUM_ID_PROP, MANAGEMENT_COMPANY_ID_PROP } from '../../middlewares/auth'
import { AUTHENTICATED_USER_PROP } from '../../middlewares/utils/auth/is-user-authenticated'
import { createRouter } from '../create-router'
import type { TRouteDefinition } from '../types'
import { IdParamSchema } from '../common'
import { ReviewAccessRequestService } from '@src/services/access-requests/review-access-request.service'
import { SendNotificationService } from '@src/services/notifications'
import { SendAccessRequestApprovedEmailService } from '@src/services/email'

export class AccessRequestsController {
  private readonly reviewService: ReviewAccessRequestService
  private readonly sendNotificationService: SendNotificationService
  private readonly sendApprovedEmailService: SendAccessRequestApprovedEmailService

  constructor(private readonly repository: AccessRequestsRepository, db: TDrizzleClient) {
    this.reviewService = new ReviewAccessRequestService(db, repository)
    this.sendApprovedEmailService = new SendAccessRequestApprovedEmailService()

    const notificationsRepo = new NotificationsRepository(db)
    const deliveriesRepo = new NotificationDeliveriesRepository(db)
    const preferencesRepo = new UserNotificationPreferencesRepository(db)
    const fcmTokensRepo = new UserFcmTokensRepository(db)
    this.sendNotificationService = new SendNotificationService(
      notificationsRepo, deliveriesRepo, preferencesRepo, fcmTokensRepo
    )
  }

  get routes(): TRouteDefinition[] {
    return [
      {
        method: 'get',
        path: '/',
        handler: this.list,
        middlewares: [authMiddleware, requireRole(ESystemRole.SUPERADMIN, ESystemRole.ADMIN)],
      },
      {
        method: 'get',
        path: '/count',
        handler: this.countPending,
        middlewares: [authMiddleware, requireRole(ESystemRole.SUPERADMIN, ESystemRole.ADMIN)],
      },
      {
        method: 'patch',
        path: '/:id/review',
        handler: this.review,
        middlewares: [
          authMiddleware,
          requireRole(ESystemRole.SUPERADMIN, ESystemRole.ADMIN),
          paramsValidator(IdParamSchema),
          bodyValidator(accessRequestReviewSchema),
        ],
      },
    ]
  }

  createRouter() {
    return createRouter(this.routes)
  }

  private list = async (c: Context): Promise<Response> => {
    const condominiumId = c.get(CONDOMINIUM_ID_PROP)
    const status = c.req.query('status')
    const page = c.req.query('page') ? Number(c.req.query('page')) : undefined
    const limit = c.req.query('limit') ? Number(c.req.query('limit')) : undefined
    const search = c.req.query('search')

    const result = await this.repository.listByCondominiumPaginated(condominiumId, {
      page,
      limit,
      status: status || undefined,
      search: search || undefined,
    })

    return c.json(result)
  }

  private countPending = async (c: Context): Promise<Response> => {
    const condominiumId = c.get(CONDOMINIUM_ID_PROP)

    const count = await this.repository.countPending(condominiumId)

    return c.json({ data: { count } })
  }

  private review = async (c: Context): Promise<Response> => {
    const { id } = c.get('params') as { id: string }
    const body = c.get('body') as TAccessRequestReview
    const user: TUser = c.get(AUTHENTICATED_USER_PROP)
    const condominiumId = c.get(CONDOMINIUM_ID_PROP)
    const managementCompanyId = c.get(MANAGEMENT_COMPANY_ID_PROP)

    const result = await this.reviewService.execute({
      accessRequestId: id,
      status: body.status,
      adminNotes: body.adminNotes,
      reviewedBy: user.id,
      condominiumId,
      managementCompanyId,
    })

    if (!result.success) {
      return c.json({ error: result.error }, 400)
    }

    // Send notification to the requesting user (fire-and-forget)
    const request = result.data.request
    if (body.status === 'approved') {
      this.sendNotificationService.execute({
        userId: request.userId,
        category: 'system',
        title: 'Access Request Approved',
        body: 'Your access request has been approved. You now have access to the condominium.',
        channels: ['in_app', 'push'],
        data: {
          accessRequestId: id,
          action: 'access_request_approved',
          i18n: {
            titleKey: 'notifications.content.accessRequestApproved.title',
            bodyKey: 'notifications.content.accessRequestApproved.body',
          },
        },
      }).catch(() => {})

      // Send approval email (fire-and-forget)
      this.repository.getByIdWithDetails(id).then(details => {
        if (!details?.user?.email) return
        const userName = details.user.displayName
          || `${details.user.firstName ?? ''} ${details.user.lastName ?? ''}`.trim()
          || details.user.email
        this.sendApprovedEmailService.execute({
          to: details.user.email,
          recipientName: userName,
          condominiumName: details.condominium?.name ?? '',
          buildingName: details.building?.name ?? '',
          unitNumber: details.unit?.unitNumber ?? '',
        }).catch(() => {})
      }).catch(() => {})
    } else if (body.status === 'rejected') {
      this.sendNotificationService.execute({
        userId: request.userId,
        category: 'system',
        title: 'Access Request Rejected',
        body: body.adminNotes
          ? `Your access request has been rejected. Reason: ${body.adminNotes}`
          : 'Your access request has been rejected.',
        channels: ['in_app', 'push'],
        priority: 'high',
        data: {
          accessRequestId: id,
          action: 'access_request_rejected',
          i18n: {
            titleKey: 'notifications.content.accessRequestRejected.title',
            bodyKey: body.adminNotes
              ? 'notifications.content.accessRequestRejected.bodyWithReason'
              : 'notifications.content.accessRequestRejected.body',
            params: body.adminNotes ? { reason: body.adminNotes } : undefined,
          },
        },
      }).catch(() => {})
    }

    return c.json({ data: result.data })
  }
}
