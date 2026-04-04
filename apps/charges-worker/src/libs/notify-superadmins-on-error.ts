import { DatabaseService } from '@database/service'
import { UserRolesRepository } from '@database/repositories'
import { getBossClient } from '@worker/boss/client'
import { QUEUES, type INotifyJobData } from '@worker/boss/queues'
import logger from '@packages/logger'

interface IWorkerErrorContext {
  jobId: string
  processor: string
  error: unknown
  elapsedSeconds: string
  extraData?: Record<string, unknown>
}

export async function notifySuperadminsOnError(ctx: IWorkerErrorContext): Promise<void> {
  try {
    const db = DatabaseService.getInstance().getDb()
    const errorMessage =
      ctx.error instanceof Error ? ctx.error.message : String(ctx.error)
    const errorStack = ctx.error instanceof Error ? ctx.error.stack : undefined

    // 1. Get superadmin users
    const userRolesRepo = new UserRolesRepository(db)
    const superadmins = await userRolesRepo.getSuperadminUsers()

    if (superadmins.length === 0) {
      logger.warn('[WorkerError] No superadmin users to notify')
      return
    }

    // 2. Enqueue email notifications to each superadmin
    const boss = getBossClient()
    const timestamp = new Date().toLocaleString('es-VE', { timeZone: 'America/Caracas' })

    const processorLabels: Record<string, string> = {
      'billing-interest-calculation': 'Cálculo de intereses',
      'billing-payment-reminders': 'Recordatorios de pago',
    }

    const processorLabel = processorLabels[ctx.processor] ?? ctx.processor

    for (const admin of superadmins) {
      if (!admin.email) continue

      const notification: INotifyJobData = {
        userId: admin.id,
        category: 'alert',
        title: `Error en worker: ${processorLabel}`,
        body: [
          `Se produjo un error en el proceso "${processorLabel}".`,
          '',
          `Fecha: ${timestamp}`,
          `Job ID: ${ctx.jobId}`,
          `Tiempo transcurrido: ${ctx.elapsedSeconds}s`,
          '',
          `Error: ${errorMessage}`,
          errorStack ? `\nStack trace:\n${errorStack}` : null,
        ]
          .filter(Boolean)
          .join('\n'),
        channels: ['email', 'in_app', 'push'],
        data: {
          processor: ctx.processor,
          jobId: ctx.jobId,
          errorMessage,
        },
      }

      try {
        await boss.send(QUEUES.NOTIFY, notification)
      } catch (sendError) {
        logger.error(
          { error: sendError instanceof Error ? sendError.message : sendError },
          '[WorkerError] Failed to enqueue superadmin notification'
        )
      }
    }
  } catch (outerError) {
    logger.error(
      { error: outerError instanceof Error ? outerError.message : outerError },
      '[WorkerError] notifySuperadminsOnError itself failed'
    )
  }
}
