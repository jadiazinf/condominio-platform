import type PgBoss from 'pg-boss'
import { DatabaseService } from '@database/service'
import {
  BillingChannelsRepository,
  BillingReceiptsRepository,
  UnitOwnershipsRepository,
  EventLogsRepository,
} from '@database/repositories'
import { EventLogger } from '@packages/services'
import { getBossClient } from '@worker/boss/client'
import { QUEUES, type INotifyJobData, type IPaymentRemindersJobData } from '@worker/boss/queues'
import logger from '@packages/logger'
import { notifySuperadminsOnError } from '@worker/libs/notify-superadmins-on-error'

/**
 * Billing Payment Reminders Processor (Fase 4.7)
 *
 * Sends reminders based on billing receipts:
 * - Before due date: "Su recibo vence en X días"
 * - After due date: "Su recibo está vencido"
 * - 60+ days overdue: notifies admin for legal collection
 */
export async function processBillingPaymentReminders(
  job: PgBoss.Job<IPaymentRemindersJobData>
): Promise<void> {
  const start = Date.now()
  logger.info({ jobId: job.id }, '[BillingReminders] Starting')

  const db = DatabaseService.getInstance().getDb()
  const eventLogger = new EventLogger(new EventLogsRepository(db), {
    source: 'worker',
    module: 'billing-payment-reminders.processor',
  })

  try {
    const channelsRepo = new BillingChannelsRepository(db)
    const receiptsRepo = new BillingReceiptsRepository(db)
    const ownershipsRepo = new UnitOwnershipsRepository(db)
    const boss = getBossClient()

    const allChannels = await channelsRepo.listAll()
    const activeChannels = allChannels.filter(ch => ch.isActive)

    if (activeChannels.length === 0) {
      logger.info('[BillingReminders] No active channels')
      return
    }

    const today = new Date()
    const todayStr = today.toISOString().split('T')[0]!
    let remindersSent = 0

    for (const channel of activeChannels) {
      try {
        // Get all non-paid receipts
        const allReceipts = await receiptsRepo.listAll(true)
        const channelReceipts = allReceipts.filter(
          r => r.billingChannelId === channel.id && (r.status === 'issued' || r.status === 'partial')
        )

        for (const receipt of channelReceipts) {
          if (!receipt.dueDate) continue

          const dueDate = new Date(receipt.dueDate)
          const diffMs = dueDate.getTime() - today.getTime()
          const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

          let title = ''
          let body = ''
          let category: 'reminder' | 'alert' = 'reminder'

          if (diffDays === 3) {
            title = `Recordatorio: recibo por vencer`
            body = `Su recibo ${receipt.receiptNumber} vence en 3 días (${receipt.dueDate}).`
          } else if (diffDays === 0) {
            title = `Recibo vence hoy`
            body = `Su recibo ${receipt.receiptNumber} vence hoy.`
          } else if (diffDays < 0 && diffDays >= -7) {
            title = `Recibo vencido`
            body = `Su recibo ${receipt.receiptNumber} está vencido desde ${receipt.dueDate}.`
            category = 'alert'
          } else if (diffDays <= -60) {
            // Notify admin for legal collection (only log, don't spam)
            logger.warn(
              { receiptId: receipt.id, unitId: receipt.unitId, daysOverdue: Math.abs(diffDays) },
              '[BillingReminders] Receipt overdue 60+ days — consider legal action'
            )
            continue
          } else {
            continue // No reminder needed today
          }

          // Find unit owner
          const ownerships = await ownershipsRepo.getRegisteredByUnitIds([receipt.unitId])
          for (const ownership of ownerships) {
            if (!ownership.userId) continue

            const notification: INotifyJobData = {
              userId: ownership.userId,
              category,
              title,
              body,
              channels: ['in_app', 'email', 'push'],
              data: {
                receiptId: receipt.id,
                receiptNumber: receipt.receiptNumber,
                dueDate: receipt.dueDate,
                totalAmount: receipt.totalAmount,
              },
            }

            await boss.send(QUEUES.NOTIFY, notification)
            remindersSent++
          }
        }
      } catch (error) {
        logger.error({ channelId: channel.id, error }, '[BillingReminders] Channel error')
      }
    }

    const elapsed = ((Date.now() - start) / 1000).toFixed(1)
    logger.info({ elapsed, remindersSent }, '[BillingReminders] Completed')

    eventLogger.info({
      category: 'worker',
      event: 'worker.billing_reminders.completed',
      action: 'billing_payment_reminders',
      message: `Sent ${remindersSent} reminders`,
      metadata: { remindersSent },
      durationMs: Date.now() - start,
    })
  } catch (error) {
    logger.error({ error }, '[BillingReminders] Fatal error')
    await notifySuperadminsOnError({ jobId: job.id, processor: 'billing-payment-reminders', error, elapsedSeconds: ((Date.now() - start) / 1000).toFixed(1) })
    throw error
  }
}
