import type { Context } from 'hono'
import { eq, and, inArray } from 'drizzle-orm'
import {
  accessRequestCreateSchema,
  validateAccessCodeSchema,
  ESystemRole,
  type TAccessRequestCreate,
  type TValidateAccessCode,
  type TUser,
} from '@packages/domain'
import {
  NotificationsRepository,
  NotificationDeliveriesRepository,
  UserNotificationPreferencesRepository,
  UserFcmTokensRepository,
} from '@database/repositories'
import { userRoles, roles, condominiumManagementCompanies } from '@database/drizzle/schema'
import type { TDrizzleClient } from '@database/repositories/interfaces'
import { bodyValidator } from '../../middlewares/utils/payload-validator'
import { authMiddleware } from '../../middlewares/auth'
import { AUTHENTICATED_USER_PROP } from '../../middlewares/utils/auth/is-user-authenticated'
import { createRouter } from '../create-router'
import type { TRouteDefinition } from '../types'
import { ValidateAccessCodeService } from '@src/services/access-codes/validate-access-code.service'
import { SubmitAccessRequestService } from '@src/services/access-requests/submit-access-request.service'
import { SendNotificationService } from '@src/services/notifications'

export class MyAccessRequestsController {
  private readonly validateCodeService: ValidateAccessCodeService
  private readonly submitRequestService: SubmitAccessRequestService
  private readonly sendNotificationService: SendNotificationService

  constructor(private readonly db: TDrizzleClient) {
    this.validateCodeService = new ValidateAccessCodeService(db)
    this.submitRequestService = new SubmitAccessRequestService(db)

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
        method: 'post',
        path: '/validate-code',
        handler: this.validateCode,
        middlewares: [authMiddleware, bodyValidator(validateAccessCodeSchema)],
      },
      {
        method: 'post',
        path: '/',
        handler: this.submit,
        middlewares: [authMiddleware, bodyValidator(accessRequestCreateSchema)],
      },
      {
        method: 'get',
        path: '/',
        handler: this.listMine,
        middlewares: [authMiddleware],
      },
    ]
  }

  createRouter() {
    return createRouter(this.routes)
  }

  private validateCode = async (c: Context): Promise<Response> => {
    const body = c.get('body') as TValidateAccessCode

    const result = await this.validateCodeService.execute({ code: body.code })

    if (!result.success) {
      return c.json({ error: result.error }, 400)
    }

    return c.json({ data: result.data })
  }

  private submit = async (c: Context): Promise<Response> => {
    const body = c.get('body') as TAccessRequestCreate
    const user: TUser = c.get(AUTHENTICATED_USER_PROP)

    const result = await this.submitRequestService.execute({
      accessCodeId: body.accessCodeId,
      unitId: body.unitId,
      ownershipType: body.ownershipType,
      userId: user.id,
    })

    if (!result.success) {
      return c.json({ error: result.error }, 400)
    }

    // Notify admins of the condominium about the new request (fire-and-forget)
    this.notifyCondominiumAdmins(
      result.data.condominiumId,
      user.displayName || user.email,
    ).catch(() => {})

    return c.json({ data: result.data }, 201)
  }

  private listMine = async (c: Context): Promise<Response> => {
    const user: TUser = c.get(AUTHENTICATED_USER_PROP)

    const status = c.req.query('status')
    const page = c.req.query('page') ? Number(c.req.query('page')) : undefined
    const limit = c.req.query('limit') ? Number(c.req.query('limit')) : undefined

    const result = await this.submitRequestService.listByUserPaginated(user.id, {
      page,
      limit,
      status: status || undefined,
    })

    return c.json(result)
  }

  /**
   * Finds admin users for a condominium AND admins of its management company,
   * then sends them a notification about a new access request.
   */
  private notifyCondominiumAdmins = async (
    condominiumId: string,
    requesterName: string,
  ): Promise<void> => {
    // 1. Find users with ADMIN role scoped to the condominium
    const condoAdmins = await this.db
      .select({ userId: userRoles.userId })
      .from(userRoles)
      .innerJoin(roles, eq(userRoles.roleId, roles.id))
      .where(
        and(
          eq(userRoles.condominiumId, condominiumId),
          eq(roles.name, ESystemRole.ADMIN),
          eq(userRoles.isActive, true)
        )
      )

    // 2. Find management companies that manage this condominium
    const mcIds = await this.db
      .select({ managementCompanyId: condominiumManagementCompanies.managementCompanyId })
      .from(condominiumManagementCompanies)
      .where(eq(condominiumManagementCompanies.condominiumId, condominiumId))

    // 3. Find ADMIN users scoped to those management companies
    let mcAdmins: { userId: string }[] = []
    if (mcIds.length > 0) {
      mcAdmins = await this.db
        .select({ userId: userRoles.userId })
        .from(userRoles)
        .innerJoin(roles, eq(userRoles.roleId, roles.id))
        .where(
          and(
            inArray(userRoles.managementCompanyId, mcIds.map(mc => mc.managementCompanyId)),
            eq(roles.name, ESystemRole.ADMIN),
            eq(userRoles.isActive, true)
          )
        )
    }

    // Deduplicate user IDs (a user could be both condo admin and MC admin)
    const uniqueUserIds = [...new Set([
      ...condoAdmins.map(a => a.userId),
      ...mcAdmins.map(a => a.userId),
    ])]

    for (const userId of uniqueUserIds) {
      this.sendNotificationService.execute({
        userId,
        category: 'system',
        title: 'new_access_request',
        body: requesterName,
        channels: ['in_app', 'push'],
        data: {
          condominiumId,
          action: 'new_access_request',
          i18n: {
            titleKey: 'notifications.content.newAccessRequest.title',
            bodyKey: 'notifications.content.newAccessRequest.body',
            params: { requesterName },
          },
        },
      }).catch(() => {})
    }
  }
}
