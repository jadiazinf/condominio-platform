import type PgBoss from 'pg-boss'
import { sql } from 'drizzle-orm'
import { DatabaseService } from '@database/service'
import {
  QuotasRepository,
  QuotaAdjustmentsRepository,
  InterestConfigurationsRepository,
  UnitsRepository,
  PaymentConceptsRepository,
} from '@database/repositories'
import { InterestCalculationService } from '@worker/services/interest-calculation.service'
import { SYSTEM_USER_ID } from '@packages/domain'
import { getBossClient } from '@worker/boss/client'
import { QUEUES, type ICalculateInterestJobData, type INotifyJobData } from '@worker/boss/queues'
import logger from '@packages/logger'
import { parseAmount, toDecimal } from '@packages/utils/money'

export async function processInterestCalculation(
  job: PgBoss.Job<ICalculateInterestJobData>
): Promise<void> {
  const start = Date.now()
  const { data } = job

  logger.info({ jobId: job.id, data }, '[Interest] Starting interest calculation')

  const db = DatabaseService.getInstance().getDb()
  const quotasRepo = new QuotasRepository(db)
  const adjustmentsRepo = new QuotaAdjustmentsRepository(db)
  const interestConfigsRepo = new InterestConfigurationsRepository(db)
  const unitsRepo = new UnitsRepository(db)
  const conceptsRepo = new PaymentConceptsRepository(db)
  const calcService = new InterestCalculationService()

  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]!

  // Fallback: mark overdue quotas in case auto-generation processor didn't run
  await markOverdueQuotas(quotasRepo, todayStr)

  // Get all overdue quotas
  const overdueQuotas = await quotasRepo.getOverdue(todayStr)

  if (overdueQuotas.length === 0) {
    logger.info('[Interest] No overdue quotas found')
    return
  }

  logger.info({ count: overdueQuotas.length }, '[Interest] Processing overdue quotas')

  // Cache interest configs by condominium to avoid repeated queries
  const configCache = new Map<
    string,
    Awaited<ReturnType<typeof interestConfigsRepo.getByCondominiumId>>
  >()
  // Cache unit buildingId lookups
  const unitBuildingCache = new Map<string, string | null>()
  // Cache concept condominiumId lookups
  const conceptCondoCache = new Map<string, string | null>()

  let processed = 0
  let updated = 0
  let skipped = 0
  let errors = 0

  for (const quota of overdueQuotas) {
    try {
      // Skip quotas with zero balance
      if (parseAmount(quota.balance) <= 0) {
        skipped++
        continue
      }

      // Resolve condominium ID from payment concept (cached)
      let condominiumId = conceptCondoCache.get(quota.paymentConceptId)
      if (condominiumId === undefined) {
        const concept = await conceptsRepo.getById(quota.paymentConceptId)
        condominiumId = concept?.condominiumId ?? null
        conceptCondoCache.set(quota.paymentConceptId, condominiumId)
      }

      if (!condominiumId) {
        skipped++
        continue
      }

      // Resolve building ID from unit (cached)
      let buildingId = unitBuildingCache.get(quota.unitId)
      if (buildingId === undefined) {
        const unit = await unitsRepo.getById(quota.unitId)
        buildingId = unit?.buildingId ?? null
        unitBuildingCache.set(quota.unitId, buildingId)
      }

      // Load all interest configs for the condominium (cached)
      let configs = configCache.get(condominiumId)
      if (!configs) {
        configs = await interestConfigsRepo.getByCondominiumId(condominiumId)
        configCache.set(condominiumId, configs)
      }

      // Use hierarchical fallback: concept-level > building-level > condominium-level
      const applicableConfig = calcService.findApplicableConfig(
        configs,
        quota.paymentConceptId,
        buildingId ?? null,
        today
      )

      if (!applicableConfig) {
        skipped++
        continue
      }

      const result = calcService.calculate(quota, applicableConfig, today)
      if (!result) {
        skipped++
        continue
      }

      // Update quota within a transaction with row-level lock
      const applied = await db.transaction(async tx => {
        // Lock the quota row to prevent race with payment application
        const lockedRows = await tx.execute<{
          id: string
          status: string
          balance: string
          interest_amount: string
          paid_amount: string
          base_amount: string
          adjustments_total: string
        }>(
          sql`SELECT id, status, balance, interest_amount, paid_amount, base_amount, adjustments_total
              FROM quotas WHERE id = ${quota.id} FOR UPDATE`
        )
        const rows = Array.isArray(lockedRows)
          ? lockedRows
          : // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ((lockedRows as any).rows ?? lockedRows)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const locked = (rows as any[])[0] as
          | {
              id: string
              status: string
              balance: string
              interest_amount: string
              paid_amount: string
              base_amount: string
              adjustments_total: string
            }
          | undefined
        if (!locked) return false

        // Re-check: skip if quota was paid/cancelled/exonerated while we waited for the lock
        if (
          locked.status === 'paid' ||
          locked.status === 'cancelled' ||
          locked.status === 'exonerated'
        ) {
          return false
        }

        // Re-check: skip if balance is now zero (payment applied between outer read and lock)
        if (parseAmount(locked.balance) <= 0) {
          return false
        }

        // Recalculate with fresh data from the locked row
        const freshQuota = {
          ...quota,
          balance: locked.balance,
          interestAmount: locked.interest_amount,
          paidAmount: locked.paid_amount,
          baseAmount: locked.base_amount,
          adjustmentsTotal: locked.adjustments_total ?? '0',
          status: locked.status as typeof quota.status,
        }

        const freshResult = calcService.calculate(freshQuota, applicableConfig, today)
        if (!freshResult) return false

        const txQuotasRepo = quotasRepo.withTx(tx)
        const txAdjustmentsRepo = adjustmentsRepo.withTx(tx)

        // Update quota interest and balance
        await txQuotasRepo.update(quota.id, {
          interestAmount: freshResult.newInterest,
          balance: freshResult.newBalance,
        })

        // Create audit adjustment record
        await txAdjustmentsRepo.create({
          quotaId: quota.id,
          previousAmount: freshResult.previousInterest,
          newAmount: freshResult.newInterest,
          adjustmentType: 'increase',
          reason: `Interest calculation: ${applicableConfig.interestType} rate applied. ${freshResult.daysOverdue} days overdue. Interest increment: ${toDecimal(freshResult.calculatedInterest)}`,
          createdBy: SYSTEM_USER_ID,
        })

        return true
      })

      if (applied) {
        updated++
      } else {
        skipped++
      }
      processed++
    } catch (error) {
      errors++
      const msg = error instanceof Error ? error.message : String(error)
      logger.error({ quotaId: quota.id, error: msg }, '[Interest] Error processing quota')
    }
  }

  // Enqueue notification with results
  if (updated > 0 || errors > 0) {
    try {
      const boss = getBossClient()
      const notification: INotifyJobData = {
        userId: SYSTEM_USER_ID,
        category: errors > 0 ? 'alert' : 'quota',
        title:
          errors > 0
            ? 'Interest calculation completed with errors'
            : 'Interest calculation completed',
        body: `Quotas processed: ${processed}. Interest applied: ${updated}. Skipped: ${skipped}. Errors: ${errors}.`,
        data: { processed, updated, skipped, errors, total: overdueQuotas.length },
      }
      await boss.send(QUEUES.NOTIFY, notification)
    } catch (notifyError) {
      logger.error({ error: notifyError }, '[Interest] Failed to enqueue notification')
    }
  }

  const elapsed = ((Date.now() - start) / 1000).toFixed(1)
  logger.info(
    { elapsedSeconds: elapsed, processed, updated, skipped, errors, total: overdueQuotas.length },
    '[Interest] Interest calculation completed'
  )
}

/**
 * Fallback: marks pending quotas as overdue when their due date has passed.
 * Primary responsibility is in auto-generation processor, but this ensures
 * overdue marking still happens even if auto-generation didn't run.
 */
async function markOverdueQuotas(quotasRepo: QuotasRepository, today: string): Promise<void> {
  try {
    const markedCount = await quotasRepo.markOverdue(today)

    if (markedCount > 0) {
      logger.info({ count: markedCount }, '[Interest] Marked quotas as overdue (fallback)')
    }
  } catch (error) {
    logger.error({ error }, '[Interest] Error marking overdue quotas')
  }
}
