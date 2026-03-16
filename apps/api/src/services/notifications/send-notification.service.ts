import type {
  NotificationsRepository,
  NotificationDeliveriesRepository,
  UserNotificationPreferencesRepository,
  UserFcmTokensRepository,
} from '@database/repositories'
import { admin } from '@libs/firebase/config'
import { WebSocketManager } from '@libs/websocket/websocket-manager'
import {
  SendNotificationService as BaseSendNotificationService,
  SendFcmNotificationService,
} from '@packages/services'

export type { ISendNotificationInput, ISendNotificationOutput } from '@packages/services'

export function createSendNotificationService(
  notificationsRepo: NotificationsRepository,
  deliveriesRepo: NotificationDeliveriesRepository,
  preferencesRepo: UserNotificationPreferencesRepository,
  fcmTokensRepo?: UserFcmTokensRepository
): BaseSendNotificationService {
  const fcmService = fcmTokensRepo
    ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
      new SendFcmNotificationService(fcmTokensRepo as any, admin.messaging())
    : undefined

  return new BaseSendNotificationService(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    notificationsRepo as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    deliveriesRepo as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    preferencesRepo as any,
    fcmService,
    async (notification, userId) => {
      const unreadCount = await notificationsRepo.getUnreadCount(userId)
      WebSocketManager.getInstance().broadcastToUser(userId, 'new_notification', {
        notification,
        unreadCount,
      })
    }
  )
}

// Re-export the class for type compatibility
export { SendNotificationService } from '@packages/services'
