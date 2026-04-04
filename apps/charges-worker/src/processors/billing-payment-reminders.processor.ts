import type PgBoss from 'pg-boss'
import { DatabaseService } from '@database/service'
import {
  BillingReceiptsRepository,
  UnitOwnershipsRepository,
  EventLogsRepository,
} from '@database/repositories'
import { EventLogger } from '@packages/services'
import { getBossClient } from '@worker/boss/client'
import { QUEUES, type INotifyJobData, type IPaymentRemindersJobData } from '@worker/boss/queues'
import logger from '@packages/logger'
import { notifySuperadminsOnError } from '@worker/libs/notify-superadmins-on-error'

// ─── Extracted logic (testeable) ───

export type TReminderTier = 'pre_due_3' | 'due_today' | 'overdue_week' | 'legal_collection' | null

export function getReminderTier(dueDateStr: string, todayStr: string): TReminderTier {
  const dueDate = new Date(dueDateStr)
  const today = new Date(todayStr)
  const diffMs = dueDate.getTime() - today.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 3) return 'pre_due_3'
  if (diffDays === 0) return 'due_today'
  if (diffDays < 0 && diffDays >= -7) return 'overdue_week'
  if (diffDays <= -60) return 'legal_collection'
  return null
}

export function getReminderContent(tier: TReminderTier, receiptNumber: string, dueDate: string): { title: string; body: string; category: 'reminder' | 'alert' } | null {
  switch (tier) {
    case 'pre_due_3':
      return { title: 'Recordatorio: recibo por vencer', body: `Su recibo ${receiptNumber} vence en 3 días (${dueDate}).`, category: 'reminder' }
    case 'due_today':
      return { title: 'Recibo vence hoy', body: `Su recibo ${receiptNumber} vence hoy.`, category: 'reminder' }
    case 'overdue_week':
      return { title: 'Recibo vencido', body: `Su recibo ${receiptNumber} está vencido desde ${dueDate}.`, category: 'alert' }
    case 'legal_collection':
      return null // Only logged, no notification to resident
    default:
      return null
  }
}

export interface IRemindersDeps {
  receiptsRepo: { listAll: (includeAll?: boolean) => Promise<any[]> }
  ownershipsRepo: { getRegisteredByUnitIds: (ids: string[]) => Promise<any[]> }
  sendNotification: (data: INotifyJobData) => Promise<void>
}

export interface IRemindersResult {
  remindersSent: number
  legalCollectionWarnings: number
  errors: number
}

export async function executePaymentReminders(
  deps: IRemindersDeps,
  todayStr: string = new Date().toISOString().split('T')[0]!,
): Promise<IRemindersResult> {
  const result: IRemindersResult = { remindersSent: 0, legalCollectionWarnings: 0, errors: 0 }

  try {
    const allReceipts = await deps.receiptsRepo.listAll(true)
    const pendingReceipts = allReceipts.filter(
      (r: any) => r.status === 'issued' || r.status === 'partial'
    )

    for (const receipt of pendingReceipts) {
      if (!receipt.dueDate) continue

      const tier = getReminderTier(receipt.dueDate, todayStr)
      if (!tier) continue

      if (tier === 'legal_collection') {
        result.legalCollectionWarnings++
        continue
      }

      const content = getReminderContent(tier, receipt.receiptNumber, receipt.dueDate)
      if (!content) continue

      const ownerships = await deps.ownershipsRepo.getRegisteredByUnitIds([receipt.unitId])

      for (const ownership of ownerships) {
        if (!ownership.userId) continue

        try {
          await deps.sendNotification({
            userId: ownership.userId,
            category: content.category,
            title: content.title,
            body: content.body,
            channels: ['in_app', 'email', 'push'],
            data: {
              receiptId: receipt.id,
              receiptNumber: receipt.receiptNumber,
              dueDate: receipt.dueDate,
              totalAmount: receipt.totalAmount,
            },
          })
          result.remindersSent++
        } catch {
          result.errors++
        }
      }
    }
  } catch {
    result.errors++
  }

  return result
}

// ─── Processor entry point ───

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
    const receiptsRepo = new BillingReceiptsRepository(db)
    const ownershipsRepo = new UnitOwnershipsRepository(db)
    const boss = getBossClient()

    const result = await executePaymentReminders({
      receiptsRepo,
      ownershipsRepo,
      sendNotification: async (data) => { await boss.send(QUEUES.NOTIFY, data) },
    })

    const elapsed = ((Date.now() - start) / 1000).toFixed(1)
    logger.info({ elapsed, ...result }, '[BillingReminders] Completed')

    eventLogger.info({
      category: 'worker',
      event: 'worker.billing_reminders.completed',
      action: 'billing_payment_reminders',
      message: `Sent ${result.remindersSent} reminders, ${result.legalCollectionWarnings} legal warnings`,
      metadata: result as unknown as Record<string, unknown>,
      durationMs: Date.now() - start,
    })
  } catch (error) {
    logger.error({ error }, '[BillingReminders] Fatal error')
    await notifySuperadminsOnError({ jobId: job.id, processor: 'billing-payment-reminders', error, elapsedSeconds: ((Date.now() - start) / 1000).toFixed(1) })
    throw error
  }
}
