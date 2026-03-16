import type PgBoss from 'pg-boss'
import { DatabaseService } from '@database/service'
import {
  NotificationsRepository,
  NotificationDeliveriesRepository,
  UserNotificationPreferencesRepository,
  UserFcmTokensRepository,
} from '@database/repositories'
import { SendNotificationService, SendFcmNotificationService } from '@packages/services'
import { admin } from '@worker/libs/firebase/config'
import type { INotifyJobData } from '@worker/boss/queues'
import logger from '@packages/logger'

export async function processNotification(job: PgBoss.Job<INotifyJobData>): Promise<void> {
  const { userId, category, title, body, data } = job.data

  logger.info({ jobId: job.id, userId, category }, '[Notify] Processing notification')

  try {
    const db = DatabaseService.getInstance().getDb()
    const notificationsRepo = new NotificationsRepository(db)
    const deliveriesRepo = new NotificationDeliveriesRepository(db)
    const preferencesRepo = new UserNotificationPreferencesRepository(db)
    const fcmTokensRepo = new UserFcmTokensRepository(db)

    // Idempotency check: skip if this job was already processed (e.g., pg-boss retry)
    const alreadySent = await notificationsRepo.existsByJobId(job.id)
    if (alreadySent) {
      logger.info(
        { jobId: job.id },
        '[Notify] Notification already sent for this job, skipping (idempotent)'
      )
      return
    }

    const fcmService = new SendFcmNotificationService(fcmTokensRepo, admin.messaging())

    const service = new SendNotificationService(
      notificationsRepo,
      deliveriesRepo,
      preferencesRepo,
      fcmService
    )

    const result = await service.execute({
      userId,
      category,
      title,
      body,
      data,
      channels: ['in_app', 'push'],
      priority: category === 'alert' ? 'high' : 'normal',
      metadata: { jobId: job.id },
    })

    if (result.success) {
      logger.info(
        { notificationId: result.data.notification.id, deliveries: result.data.deliveryIds.length },
        '[Notify] Notification sent successfully'
      )
    } else {
      // Throw so pg-boss marks the job as failed and retries it
      throw new Error(`Notification send failed: ${result.error}`)
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    logger.error({ userId, error: msg }, '[Notify] Failed to send notification')
    // Re-throw so pg-boss retries the job
    throw error
  }
}
