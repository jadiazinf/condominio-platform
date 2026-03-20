import { DatabaseService } from '@database/service'
import { UserRolesRepository, QuotaGenerationLogsRepository } from '@database/repositories'
import { getBossClient } from '@worker/boss/client'
import { QUEUES, type INotifyJobData } from '@worker/boss/queues'
import logger from '@packages/logger'

interface IWorkerErrorContext {
  jobId: string
  processor: 'bulk-generation' | 'auto-generation' | 'interest-calculation'
  paymentConceptId?: string
  error: unknown
  elapsedSeconds: string
  extraData?: Record<string, unknown>
}

/**
 * Notifies all active superadmins via email when a worker job fails.
 * Also logs the error to `quota_generation_logs` if applicable.
 */
export async function notifySuperadminsOnError(ctx: IWorkerErrorContext): Promise<void> {
  const errorMessage = ctx.error instanceof Error ? ctx.error.message : String(ctx.error)
  const errorStack = ctx.error instanceof Error ? ctx.error.stack : undefined

  try {
    const db = DatabaseService.getInstance().getDb()
    const userRolesRepo = new UserRolesRepository(db)

    // 1. Get all active superadmin users
    const superadmins = await userRolesRepo.getActiveSuperadminUsers()

    if (superadmins.length === 0) {
      logger.warn('[WorkerError] No active superadmins found to notify')
      return
    }

    // 2. Log error to quota_generation_logs if applicable
    if (ctx.processor === 'bulk-generation' || ctx.processor === 'auto-generation') {
      const logGeneratedBy = superadmins[0]?.id
      if (logGeneratedBy) {
        try {
          const logsRepo = new QuotaGenerationLogsRepository(db)
          await logsRepo.create({
            generationRuleId: null,
            generationScheduleId: null,
            quotaFormulaId: null,
            generationMethod: ctx.processor === 'bulk-generation' ? 'bulk' : 'scheduled',
            periodYear: new Date().getUTCFullYear(),
            periodMonth: new Date().getUTCMonth() + 1,
            periodDescription: `Error: ${ctx.processor} - ${new Date().toISOString()}`,
            quotasCreated: 0,
            quotasFailed: 0,
            totalAmount: null,
            currencyId: null,
            unitsAffected: null,
            parameters: {
              jobId: ctx.jobId,
              paymentConceptId: ctx.paymentConceptId ?? null,
              elapsedSeconds: ctx.elapsedSeconds,
              ...ctx.extraData,
            },
            formulaSnapshot: null,
            status: 'failed',
            errorDetails: `${errorMessage}\n\n${errorStack ?? ''}`,
            generatedBy: logGeneratedBy,
          })
        } catch (logError) {
          logger.error(
            { error: logError instanceof Error ? logError.message : logError },
            '[WorkerError] Failed to create error log entry'
          )
        }
      }
    }

    // 3. Enqueue email notifications to each superadmin
    const boss = getBossClient()
    const timestamp = new Date().toLocaleString('es-VE', { timeZone: 'America/Caracas' })

    const processorLabels: Record<string, string> = {
      'bulk-generation': 'Generación masiva de cuotas',
      'auto-generation': 'Generación automática de cuotas',
      'interest-calculation': 'Cálculo de intereses',
    }

    const processorLabel = processorLabels[ctx.processor] ?? ctx.processor

    for (const admin of superadmins) {
      if (!admin.email) continue

      const notification: INotifyJobData = {
        userId: admin.id,
        category: 'alert',
        title: `⚠️ Error en worker: ${processorLabel}`,
        body: [
          `Se produjo un error en el proceso "${processorLabel}".`,
          '',
          `📅 Fecha: ${timestamp}`,
          `🔑 Job ID: ${ctx.jobId}`,
          ctx.paymentConceptId ? `📋 Concepto: ${ctx.paymentConceptId}` : null,
          `⏱️ Tiempo transcurrido: ${ctx.elapsedSeconds}s`,
          '',
          `❌ Error: ${errorMessage}`,
          errorStack ? `\n📜 Stack trace:\n${errorStack}` : null,
        ]
          .filter(Boolean)
          .join('\n'),
        channels: ['email', 'in_app'],
        data: {
          processor: ctx.processor,
          jobId: ctx.jobId,
          paymentConceptId: ctx.paymentConceptId,
          errorMessage,
          errorStack,
          elapsedSeconds: ctx.elapsedSeconds,
          timestamp,
          ...ctx.extraData,
        },
      }

      await boss.send(QUEUES.NOTIFY, notification)
    }

    logger.info(
      { superadminsNotified: superadmins.length, processor: ctx.processor },
      '[WorkerError] Superadmin error notifications enqueued'
    )
  } catch (notifyError) {
    // Don't let notification failures mask the original error
    logger.error(
      {
        error: notifyError instanceof Error ? notifyError.message : notifyError,
        originalError: errorMessage,
      },
      '[WorkerError] Failed to notify superadmins'
    )
  }
}
