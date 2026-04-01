import type PgBoss from 'pg-boss'
import { DatabaseService } from '@database/service'
import {
  BillingChannelsRepository,
  ChargeTypesRepository,
  ChargesRepository,
  UnitLedgerRepository,
  UnitsRepository,
  EventLogsRepository,
} from '@database/repositories'
import { EventLogger } from '@packages/services'
import { AppendLedgerEntryService } from '@api/services/billing-ledger/append-ledger-entry.service'
import { CreateChargeWithLedgerEntryService } from '@api/services/billing-ledger/create-charge-with-ledger-entry.service'
import { CalculateChannelInterestService } from '@api/services/billing-fees/calculate-channel-interest.service'
import logger from '@packages/logger'
import { notifySuperadminsOnError } from '@worker/libs/notify-superadmins-on-error'
import type { ICalculateInterestJobData } from '@worker/boss/queues'

/**
 * Billing Interest Calculation Processor (Fase 4.7)
 *
 * Calculates interest on overdue CHANNEL balance (not per individual charge).
 * Creates interest charges + ledger entries.
 * Runs daily at 3:00 AM UTC.
 */
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
    const channelsRepo = new BillingChannelsRepository(db)
    const chargeTypesRepo = new ChargeTypesRepository(db)
    const chargesRepo = new ChargesRepository(db)
    const ledgerRepo = new UnitLedgerRepository(db)
    const unitsRepo = new UnitsRepository(db)

    const appendService = new AppendLedgerEntryService(ledgerRepo)
    const createChargeService = new CreateChargeWithLedgerEntryService(chargesRepo, appendService)
    const interestService = new CalculateChannelInterestService(
      chargesRepo, chargeTypesRepo, createChargeService,
    )

    // Get channels with interest enabled
    const allChannels = await channelsRepo.listAll()
    const interestChannels = allChannels.filter(
      ch => ch.isActive && ch.interestType !== 'none' && ch.interestRate
    )

    if (interestChannels.length === 0) {
      logger.info('[BillingInterest] No channels with interest configured')
      return
    }

    const today = new Date().toISOString().split('T')[0]!
    let totalInterestCharges = 0
    let totalErrors = 0

    for (const channel of interestChannels) {
      try {
        // Get all units for this channel's scope
        const units = channel.buildingId
          ? await (unitsRepo as any).findByBuilding(channel.buildingId, { active: true })
          : await (unitsRepo as any).findByCondominium(channel.condominiumId, { active: true })

        for (const unit of units) {
          try {
            const result = await interestService.execute({
              channel,
              unitId: unit.id,
              calculationDate: today,
            })

            if (result.success && parseFloat(result.data.interestAmount) > 0) {
              totalInterestCharges++
              logger.debug(
                { channelId: channel.id, unitId: unit.id, interest: result.data.interestAmount },
                '[BillingInterest] Interest applied'
              )
            }
          } catch (error) {
            totalErrors++
            logger.error({ channelId: channel.id, unitId: unit.id, error }, '[BillingInterest] Unit error')
          }
        }
      } catch (error) {
        totalErrors++
        logger.error({ channelId: channel.id, error }, '[BillingInterest] Channel error')
      }
    }

    const elapsed = ((Date.now() - start) / 1000).toFixed(1)
    logger.info({ elapsed, totalInterestCharges, totalErrors }, '[BillingInterest] Completed')

    eventLogger.info({
      category: 'worker',
      event: 'worker.billing_interest.completed',
      action: 'billing_interest_calculate',
      message: `Created ${totalInterestCharges} interest charges`,
      metadata: { totalInterestCharges, totalErrors, channelsProcessed: interestChannels.length },
      durationMs: Date.now() - start,
    })
  } catch (error) {
    logger.error({ error }, '[BillingInterest] Fatal error')
    await notifySuperadminsOnError({ jobId: job.id, processor: 'billing-interest-calculation', error, elapsedSeconds: ((Date.now() - start) / 1000).toFixed(1) })
    throw error
  }
}
