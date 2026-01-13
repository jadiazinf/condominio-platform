import type { TNotification, TNotificationCreate } from '@packages/domain'
import type {
  NotificationsRepository,
  NotificationDeliveriesRepository,
  UserNotificationPreferencesRepository,
  UserFcmTokensRepository,
} from '@database/repositories'
import { type TServiceResult, success } from '../base.service'
import { SendFcmNotificationService } from './send-fcm-notification.service'
import logger from '@utils/logger'

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

export class SendNotificationService {
  private readonly fcmService?: SendFcmNotificationService

  constructor(
    private readonly notificationsRepository: NotificationsRepository,
    private readonly deliveriesRepository: NotificationDeliveriesRepository,
    private readonly preferencesRepository: UserNotificationPreferencesRepository,
    fcmTokensRepository?: UserFcmTokensRepository
  ) {
    if (fcmTokensRepository) {
      this.fcmService = new SendFcmNotificationService(fcmTokensRepository)
    }
  }

  async execute(input: ISendNotificationInput): Promise<TServiceResult<ISendNotificationOutput>> {
    const channels = input.channels ?? ['in_app']
    const enabledChannels: Array<'in_app' | 'email' | 'push'> = []

    // Check user preferences for each channel
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

    // If no channels are enabled, still create the notification but no deliveries
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

    // Create delivery records for each enabled channel
    for (const channel of enabledChannels) {
      // For push, we send via FCM and track the result
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

            // Create delivery record based on result
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
            // Create failed delivery record
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

      // For in_app and email channels
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

    return success({ notification, deliveryIds, pushResult })
  }

  /**
   * Converts data record to string values for FCM.
   * FCM data payloads only support string values.
   */
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
