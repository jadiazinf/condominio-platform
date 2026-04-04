import type PgBoss from 'pg-boss'
import { DatabaseService } from '@database/service'
import {
  ChargeTypesRepository,
  ChargesRepository,
  UnitLedgerRepository,
  UnitsRepository,
  CondominiumsRepository,
  EventLogsRepository,
} from '@database/repositories'
import { InterestConfigurationsRepository } from '@database/repositories'
import { EventLogger } from '@packages/services'
import { AppendLedgerEntryService } from '@api/services/billing-ledger/append-ledger-entry.service'
import { CreateChargeWithLedgerEntryService } from '@api/services/billing-ledger/create-charge-with-ledger-entry.service'
import { CalculateChannelInterestService, type IInterestConfig } from '@api/services/billing-fees/calculate-channel-interest.service'
import logger from '@packages/logger'
import { notifySuperadminsOnError } from '@worker/libs/notify-superadmins-on-error'
import type { ICalculateInterestJobData } from '@worker/boss/queues'

// ─── Extracted logic (testeable) ───

export interface IInterestDeps {
  condominiumsRepo: { getAllActive: () => Promise<any[]> }
  interestConfigsRepo: { getByCondominiumId: (condominiumId: string) => Promise<any[]> }
  unitsRepo: { findByCondominium: (id: string, opts?: any) => Promise<any[]> }
  interestService: { execute: (input: any) => Promise<any> }
}

export interface IInterestResult {
  totalInterestCharges: number
  totalErrors: number
  condominiumsProcessed: number
}

export async function executeInterestCalculation(
  deps: IInterestDeps,
  today: string = new Date().toISOString().split('T')[0]!,
): Promise<IInterestResult> {
  const allCondominiums = await deps.condominiumsRepo.getAllActive()

  const result: IInterestResult = {
    totalInterestCharges: 0,
    totalErrors: 0,
    condominiumsProcessed: 0,
  }

  for (const condo of allCondominiums) {
    try {
      // Get interest config for this condominium
      const configs = await deps.interestConfigsRepo.getByCondominiumId(condo.id)
      const activeConfig = configs.find((c: any) => c.isActive)
      if (!activeConfig || activeConfig.interestType === 'none') continue

      result.condominiumsProcessed++

      const config: IInterestConfig = {
        interestType: activeConfig.interestType,
        interestRate: activeConfig.interestRate ?? activeConfig.fixedAmount,
        interestGracePeriodDays: activeConfig.gracePeriodDays ?? 0,
        currencyId: activeConfig.currencyId ?? condo.defaultCurrencyId,
      }

      const units = await deps.unitsRepo.findByCondominium(condo.id, { active: true })

      for (const unit of units) {
        try {
          const calcResult = await deps.interestService.execute({
            condominiumId: condo.id,
            config,
            unitId: unit.id,
            calculationDate: today,
          })

          if (calcResult.success && parseFloat(calcResult.data.interestAmount) > 0) {
            result.totalInterestCharges++
          }
        } catch {
          result.totalErrors++
        }
      }
    } catch {
      result.totalErrors++
    }
  }

  return result
}

// ─── Processor entry point ───

export async function processBillingInterestCalculation(
  job: PgBoss.Job<ICalculateInterestJobData>
): Promise<void> {
  const start = Date.now()
  logger.info({ jobId: job.id }, '[BillingInterest] Starting')

  const db = DatabaseService.getInstance().getDb()
  const eventLogger = new EventLogger(new EventLogsRepository(db), {
    source: 'worker',
    module: 'billing-interest-calculation.processor',
  })

  try {
    const condominiumsRepo = new CondominiumsRepository(db)
    const interestConfigsRepo = new InterestConfigurationsRepository(db)
    const chargeTypesRepo = new ChargeTypesRepository(db)
    const chargesRepo = new ChargesRepository(db)
    const ledgerRepo = new UnitLedgerRepository(db)
    const unitsRepo = new UnitsRepository(db)

    const appendService = new AppendLedgerEntryService(ledgerRepo)
    const createChargeService = new CreateChargeWithLedgerEntryService(chargesRepo, appendService)
    const interestService = new CalculateChannelInterestService(
      chargesRepo, chargeTypesRepo, createChargeService,
    )

    const result = await executeInterestCalculation({
      condominiumsRepo: condominiumsRepo as any,
      interestConfigsRepo: interestConfigsRepo as any,
      unitsRepo: unitsRepo as any,
      interestService,
    })

    const elapsed = ((Date.now() - start) / 1000).toFixed(1)
    logger.info({ elapsed, ...result }, '[BillingInterest] Completed')

    eventLogger.info({
      category: 'worker',
      event: 'worker.billing_interest.completed',
      action: 'billing_interest_calculate',
      message: `Created ${result.totalInterestCharges} interest charges`,
      metadata: result as unknown as Record<string, unknown>,
      durationMs: Date.now() - start,
    })
  } catch (error) {
    logger.error({ error }, '[BillingInterest] Fatal error')
    await notifySuperadminsOnError({ jobId: job.id, processor: 'billing-interest-calculation', error, elapsedSeconds: ((Date.now() - start) / 1000).toFixed(1) })
    throw error
  }
}
