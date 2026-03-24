import type PgBoss from 'pg-boss'
import { DatabaseService } from '@database/service'
import {
  QuotasRepository,
  CondominiumsRepository,
  UnitOwnershipsRepository,
} from '@database/repositories'
import { PaymentReminderService } from '@api/services/account-statements/payment-reminder.service'
import { EventLogger } from '@packages/services'
import { EventLogsRepository } from '@database/repositories'
import { getBossClient } from '@worker/boss/client'
import { QUEUES, type IPaymentRemindersJobData, type INotifyJobData } from '@worker/boss/queues'
import logger from '@packages/logger'
import { notifySuperadminsOnError } from '@worker/libs/notify-superadmins-on-error'

export async function processPaymentReminders(
  job: PgBoss.Job<IPaymentRemindersJobData>
): Promise<void> {
  const start = Date.now()

  logger.info({ jobId: job.id }, '[Reminders] Starting payment reminders')

  const db = DatabaseService.getInstance().getDb()
  const eventLogger = new EventLogger(new EventLogsRepository(db), {
    source: 'worker',
    module: 'payment-reminders.processor',
  })

  try {
    await _processPaymentReminders(job)

    const durationMs = Date.now() - start
    eventLogger.info({
      category: 'worker',
      event: 'worker.payment_reminders.completed',
      action: 'send_reminders',
      message: `Payment reminders job ${job.id} completed`,
      metadata: { jobId: job.id },
      durationMs,
    })
  } catch (error) {
    const elapsed = ((Date.now() - start) / 1000).toFixed(1)
    const serializedError =
      error instanceof Error
        ? { message: error.message, stack: error.stack, name: error.name }
        : String(error)
    logger.error(
      { jobId: job.id, error: serializedError, elapsedSeconds: elapsed },
      '[Reminders] Job failed with error'
    )

    eventLogger.critical({
      category: 'worker',
      event: 'worker.payment_reminders.failed',
      action: 'send_reminders',
      message: `Payment reminders job ${job.id} failed: ${error instanceof Error ? error.message : String(error)}`,
      errorCode: 'INTERNAL_ERROR',
      errorMessage: error instanceof Error ? error.message : String(error),
      metadata: { jobId: job.id },
      durationMs: Date.now() - start,
    })

    await notifySuperadminsOnError({
      jobId: job.id,
      processor: 'payment-reminders',
      error,
      elapsedSeconds: elapsed,
    })

    throw error
  }
}

async function _processPaymentReminders(job: PgBoss.Job<IPaymentRemindersJobData>): Promise<void> {
  const start = Date.now()
  const { data } = job

  const db = DatabaseService.getInstance().getDb()
  const quotasRepo = new QuotasRepository(db)
  const condominiumsRepo = new CondominiumsRepository(db)
  const ownershipsRepo = new UnitOwnershipsRepository(db)
  const boss = getBossClient()

  const today = new Date().toISOString().split('T')[0]!

  // Get condominiums to process
  let condominiumIds: string[]
  if (data.condominiumId) {
    condominiumIds = [data.condominiumId]
  } else {
    const allCondos = await condominiumsRepo.getAllActive()
    condominiumIds = allCondos.map(c => c.id)
  }

  if (condominiumIds.length === 0) {
    logger.info('[Reminders] No active condominiums found')
    return
  }

  logger.info({ condominiumCount: condominiumIds.length }, '[Reminders] Processing condominiums')

  let totalCandidates = 0
  let totalNotifications = 0

  for (const condominiumId of condominiumIds) {
    try {
      // Adapt repo method name and filter null userIds to match the service's expected interface
      const ownershipsAdapter = {
        listByCondominiumId: async (id: string) => {
          const all = await ownershipsRepo.listByCondominiumId(id)
          return all
            .filter((o): o is typeof o & { userId: string } => o.userId != null)
            .map(o => ({ unitId: o.unitId, userId: o.userId }))
        },
      }
      const service = new PaymentReminderService(quotasRepo, ownershipsAdapter)
      const result = await service.execute({ condominiumId, asOfDate: today })

      if (!result.success) {
        logger.warn(
          { condominiumId, error: result.error },
          '[Reminders] Service returned error for condominium'
        )
        continue
      }

      const { candidates } = result.data
      totalCandidates += candidates.length

      if (candidates.length === 0) continue

      // Enqueue a notification for each candidate
      for (const candidate of candidates) {
        const { title, body } = buildReminderMessage(candidate.reminderType, candidate)

        const notification: INotifyJobData = {
          userId: candidate.userId,
          category: 'reminder',
          title,
          body,
          channels: ['in_app', 'email', 'push'],
          data: {
            condominiumId,
            quotaId: candidate.quotaId,
            unitId: candidate.unitId,
            reminderType: candidate.reminderType,
            dueDate: candidate.dueDate,
            balance: candidate.balance,
            periodDescription: candidate.periodDescription,
          },
        }

        await boss.send(QUEUES.NOTIFY, notification)
        totalNotifications++
      }

      logger.info(
        { condominiumId, candidates: candidates.length },
        '[Reminders] Condominium processed'
      )
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      logger.error({ condominiumId, error: msg }, '[Reminders] Error processing condominium')
    }
  }

  const elapsed = ((Date.now() - start) / 1000).toFixed(1)
  logger.info(
    { elapsedSeconds: elapsed, totalCandidates, totalNotifications },
    '[Reminders] Cycle completed'
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Reminder message templates
// ─────────────────────────────────────────────────────────────────────────────

type TReminderType = 'pre_due_5' | 'due_today' | 'overdue_5' | 'overdue_15' | 'overdue_30'

function buildReminderMessage(
  type: TReminderType,
  candidate: { balance: string; periodDescription: string; dueDate: string }
): { title: string; body: string } {
  const { balance, periodDescription, dueDate } = candidate

  switch (type) {
    case 'pre_due_5':
      return {
        title: 'Recordatorio: cuota próxima a vencer',
        body: `Tu cuota de ${periodDescription} por ${balance} vence el ${dueDate}. Realiza tu pago a tiempo para evitar recargos.`,
      }
    case 'due_today':
      return {
        title: 'Tu cuota vence hoy',
        body: `La cuota de ${periodDescription} por ${balance} vence hoy (${dueDate}). Realiza tu pago para evitar intereses de mora.`,
      }
    case 'overdue_5':
      return {
        title: 'Cuota vencida — 5 días',
        body: `Tu cuota de ${periodDescription} por ${balance} venció el ${dueDate}. Tienes 5 días de atraso. Realiza tu pago lo antes posible.`,
      }
    case 'overdue_15':
      return {
        title: 'Cuota vencida — 15 días',
        body: `Tu cuota de ${periodDescription} por ${balance} tiene 15 días de atraso (vencimiento: ${dueDate}). Se están aplicando intereses de mora.`,
      }
    case 'overdue_30':
      return {
        title: 'Cuota vencida — 30 días',
        body: `Tu cuota de ${periodDescription} por ${balance} tiene 30 días de atraso (vencimiento: ${dueDate}). Contacta a la administradora para regularizar tu situación.`,
      }
  }
}
