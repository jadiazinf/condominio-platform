import type PgBoss from 'pg-boss'
import { DatabaseService } from '@database/service'
import {
  QuotasRepository,
  QuotaAdjustmentsRepository,
  InterestConfigurationsRepository,
} from '@database/repositories'
import { InterestCalculationService } from '@worker/services/interest-calculation.service'
import type { ICalculateInterestJobData } from '@worker/boss/queues'
import logger from '@packages/logger'

const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000000'

export async function processInterestCalculation(
  job: PgBoss.Job<ICalculateInterestJobData>,
): Promise<void> {
  const start = Date.now()
  const { data } = job

  logger.info({ jobId: job.id, data }, '[Interest] Starting interest calculation')

  const db = DatabaseService.getInstance().getDb()
  const quotasRepo = new QuotasRepository(db)
  const adjustmentsRepo = new QuotaAdjustmentsRepository(db)
  const interestConfigsRepo = new InterestConfigurationsRepository(db)
  const calcService = new InterestCalculationService()

  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]!

  // Get all overdue quotas
  const overdueQuotas = await quotasRepo.getOverdue(todayStr)

  if (overdueQuotas.length === 0) {
    logger.info('[Interest] No overdue quotas found')
    return
  }

  logger.info({ count: overdueQuotas.length }, '[Interest] Processing overdue quotas')

  // Cache interest configs by condominium to avoid repeated queries
  const configCache = new Map<string, Awaited<ReturnType<typeof interestConfigsRepo.getByCondominiumId>>>()

  let processed = 0
  let updated = 0
  let skipped = 0
  let errors = 0

  for (const quota of overdueQuotas) {
    try {
      // Skip quotas with zero balance
      if (parseFloat(quota.balance) <= 0) {
        skipped++
        continue
      }

      // Get the unit to find building/condominium context
      // quota has unitId, we need to find which condominium's configs to use
      // For now, load configs by payment concept first, fall back to broader scope
      const conceptConfig = await interestConfigsRepo.getActiveForDate(
        quota.paymentConceptId,
        todayStr,
      )

      if (!conceptConfig) {
        // No applicable interest configuration
        skipped++
        continue
      }

      const result = calcService.calculate(quota, conceptConfig, today)
      if (!result) {
        skipped++
        continue
      }

      // Update quota within a transaction
      await db.transaction(async (tx) => {
        const txQuotasRepo = quotasRepo.withTx(tx)
        const txAdjustmentsRepo = adjustmentsRepo.withTx(tx)

        // Update quota interest and balance
        await txQuotasRepo.update(quota.id, {
          interestAmount: result.newInterest,
          balance: result.newBalance,
        })

        // Create audit adjustment record
        await txAdjustmentsRepo.create({
          quotaId: quota.id,
          previousAmount: result.previousInterest,
          newAmount: result.newInterest,
          adjustmentType: 'increase',
          reason: `Interest calculation: ${conceptConfig.interestType} rate applied. ${result.daysOverdue} days overdue. Interest increment: ${result.calculatedInterest.toFixed(2)}`,
          createdBy: SYSTEM_USER_ID,
        })
      })

      updated++
      processed++
    } catch (error) {
      errors++
      const msg = error instanceof Error ? error.message : String(error)
      logger.error({ quotaId: quota.id, error: msg }, '[Interest] Error processing quota')
    }
  }

  const elapsed = ((Date.now() - start) / 1000).toFixed(1)
  logger.info(
    { elapsedSeconds: elapsed, processed, updated, skipped, errors, total: overdueQuotas.length },
    '[Interest] Interest calculation completed',
  )
}
