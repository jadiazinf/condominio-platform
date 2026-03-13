import type { TNotification, TNotificationCreate } from '../../../domain/src'
import type {
  NotificationsRepository,
  NotificationDeliveriesRepository,
  UserNotificationPreferencesRepository,
} from '../../../database/src/repositories'
import { type TServiceResult, success } from '../base'
import { SendFcmNotificationService } from './send-fcm-notification.service'
import logger from '../../../logger/src'

export interface ISendNotificationInput {
  userId: string
  category: TNotificationCreate['category']
  title: string
  body: string
  priority?: TNotificationCreate['priority']
  data?: Record<string, unknown>
  templateId?: string
  channels?: Array<'in_app' | 'email' | 'push'>
  expiresAt?: Date
}

export interface ISendNotificationOutput {
  notification: TNotification
  deliveryIds: string[]
  pushResult?: {
    successCount: number
    failureCount: number
  }
}

export type TNotificationHook = (notification: TNotification, userId: string) => Promise<void>

export class SendNotificationService {
  constructor(
    private readonly notificationsRepository: NotificationsRepository,
    private readonly deliveriesRepository: NotificationDeliveriesRepository,
    private readonly preferencesRepository: UserNotificationPreferencesRepository,
    private readonly fcmService?: SendFcmNotificationService,
    private readonly onNotificationSent?: TNotificationHook
  ) {}

  async execute(input: ISendNotificationInput): Promise<TServiceResult<ISendNotificationOutput>> {
    const channels = input.channels ?? ['in_app']
    const enabledChannels: Array<'in_app' | 'email' | 'push'> = []

    for (const channel of channels) {
      const isEnabled = await this.preferencesRepository.isNotificationEnabled(
        input.userId,
        input.category,
        channel
      )
      if (isEnabled) {
        enabledChannels.push(channel)
      }
    }

    const notification = await this.notificationsRepository.create({
      userId: input.userId,
      templateId: input.templateId ?? null,
      category: input.category,
      title: input.title,
      body: input.body,
      priority: input.priority ?? 'normal',
      data: input.data ?? null,
      isRead: false,
      expiresAt: input.expiresAt ?? null,
      metadata: null,
    })

    const deliveryIds: string[] = []
    let pushResult: { successCount: number; failureCount: number } | undefined

    for (const channel of enabledChannels) {
      if (channel === 'push') {
        if (this.fcmService) {
          const fcmResult = await this.fcmService.execute({
            userId: input.userId,
            title: input.title,
            body: input.body,
            data: this.convertDataToStrings(input.data),
            priority: input.priority === 'urgent' || input.priority === 'high' ? 'high' : 'normal',
          })

          if (fcmResult.success) {
            pushResult = {
              successCount: fcmResult.data.successCount,
              failureCount: fcmResult.data.failureCount,
            }

            const delivery = await this.deliveriesRepository.create({
              notificationId: notification.id,
              channel: 'push',
              status: fcmResult.data.successCount > 0 ? 'delivered' : 'failed',
              sentAt: new Date(),
              deliveredAt: fcmResult.data.successCount > 0 ? new Date() : null,
              failedAt:
                fcmResult.data.failureCount > 0 && fcmResult.data.successCount === 0
                  ? new Date()
                  : null,
              errorMessage:
                fcmResult.data.failureCount > 0
                  ? `${fcmResult.data.failureCount} device(s) failed`
                  : null,
              retryCount: 0,
              externalId: null,
              metadata: {
                successCount: fcmResult.data.successCount,
                failureCount: fcmResult.data.failureCount,
                invalidTokens: fcmResult.data.invalidTokens.length,
              },
            })
            deliveryIds.push(delivery.id)
          } else {
            logger.error({ error: fcmResult.error }, 'FCM notification failed')
            const delivery = await this.deliveriesRepository.create({
              notificationId: notification.id,
              channel: 'push',
              status: 'failed',
              sentAt: new Date(),
              deliveredAt: null,
              failedAt: new Date(),
              errorMessage: fcmResult.error,
              retryCount: 0,
              externalId: null,
              metadata: null,
            })
            deliveryIds.push(delivery.id)
          }
        } else {
          logger.warn('Push notification requested but FCM service not configured')
        }
        continue
      }

      const delivery = await this.deliveriesRepository.create({
        notificationId: notification.id,
        channel,
        status: channel === 'in_app' ? 'delivered' : 'pending',
        sentAt: channel === 'in_app' ? new Date() : null,
        deliveredAt: channel === 'in_app' ? new Date() : null,
        failedAt: null,
        errorMessage: null,
        retryCount: 0,
        externalId: null,
        metadata: null,
      })
      deliveryIds.push(delivery.id)
    }

    if (this.onNotificationSent) {
      try {
        await this.onNotificationSent(notification, input.userId)
      } catch {
        // Don't break notification flow if hook fails
      }
    }

    return success({ notification, deliveryIds, pushResult })
  }

  private convertDataToStrings(data?: Record<string, unknown>): Record<string, string> | undefined {
    if (!data) return undefined

    const result: Record<string, string> = {}
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined && value !== null) {
        result[key] = typeof value === 'string' ? value : JSON.stringify(value)
      }
    }
    return result
  }
}
