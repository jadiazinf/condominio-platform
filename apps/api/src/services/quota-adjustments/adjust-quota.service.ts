import type { TQuotaAdjustment, TAdjustmentType, TQuotaStatus } from '@packages/domain'
import type { QuotasRepository, QuotaAdjustmentsRepository } from '@database/repositories'
import type { TDrizzleClient } from '@database/repositories/interfaces'
import { type TServiceResult, success, failure } from '../base.service'
import { parseAmount, toDecimal } from '@packages/utils/money'

type TAdjustQuotaInput = {
  quotaId: string
  newAmount: string
  adjustmentType: TAdjustmentType
  reason: string
  adjustedByUserId: string
}

type TAdjustQuotaOutput = {
  adjustment: TQuotaAdjustment
  message: string
}

/**
 * Service to adjust a quota's base amount.
 * Creates an audit record in quota_adjustments and updates the quota.
 */
export class AdjustQuotaService {
  constructor(
    private readonly db: TDrizzleClient,
    private readonly quotasRepository: QuotasRepository,
    private readonly quotaAdjustmentsRepository: QuotaAdjustmentsRepository
  ) {}

  async execute(input: TAdjustQuotaInput): Promise<TServiceResult<TAdjustQuotaOutput>> {
    const { quotaId, newAmount, adjustmentType, reason, adjustedByUserId } = input

    // 1. Get the quota
    const quota = await this.quotasRepository.getById(quotaId)
    if (!quota) {
      return failure('Quota not found', 'NOT_FOUND')
    }

    // 2. Validate: can't adjust cancelled or exonerated quotas
    if (quota.status === 'cancelled') {
      return failure('Cannot adjust a cancelled quota', 'BAD_REQUEST')
    }
    if (quota.status === 'exonerated') {
      return failure('Cannot adjust an exonerated quota', 'BAD_REQUEST')
    }

    // 3. Validate: new amount must be different from current effective amount
    const currentAdjTotal = parseAmount(quota.adjustmentsTotal)
    const currentEffective = toDecimal(parseAmount(quota.baseAmount) + currentAdjTotal)
    if (currentEffective === toDecimal(parseAmount(newAmount))) {
      return failure('New amount must be different from current amount', 'BAD_REQUEST')
    }

    // 4. Validate: new amount must be positive (unless waiver or exoneration)
    const newAmountNum = parseAmount(newAmount)
    if (adjustmentType !== 'waiver' && adjustmentType !== 'exoneration' && newAmountNum < 0) {
      return failure('New amount cannot be negative', 'BAD_REQUEST')
    }

    // 5. For waiver or exoneration, new amount must be 0
    if (adjustmentType === 'waiver' && newAmountNum !== 0) {
      return failure('Waiver adjustment must set amount to 0', 'BAD_REQUEST')
    }
    if (adjustmentType === 'exoneration' && newAmountNum !== 0) {
      return failure('Exoneration adjustment must set amount to 0', 'BAD_REQUEST')
    }

    // 6. Calculate new balance
    const paidAmount = parseAmount(quota.paidAmount)
    const interestAmount = parseAmount(quota.interestAmount)
    // For exoneration, wipe interest so balance goes to 0
    const effectiveInterest = adjustmentType === 'exoneration' ? 0 : interestAmount
    const newBalance = newAmountNum + effectiveInterest - paidAmount

    // 7. Determine new status
    let newStatus: TQuotaStatus = quota.status
    if (adjustmentType === 'exoneration') {
      newStatus = 'exonerated'
    } else if (adjustmentType === 'waiver') {
      newStatus = 'cancelled'
    } else if (newBalance <= 0) {
      newStatus = 'paid'
    }

    // 8. All writes inside a transaction for atomicity
    return await this.db.transaction(async tx => {
      const txAdjustmentsRepo = this.quotaAdjustmentsRepository.withTx(tx)
      const txQuotasRepo = this.quotasRepository.withTx(tx)

      // Create the adjustment record (previousAmount/newAmount are effective amounts)
      const adjustment = await txAdjustmentsRepo.create({
        quotaId,
        previousAmount: currentEffective,
        newAmount,
        adjustmentType,
        reason,
        createdBy: adjustedByUserId,
      })

      // Update the quota (baseAmount is NEVER mutated — use adjustmentsTotal)
      const newAdjTotal = newAmountNum - parseAmount(quota.baseAmount)
      const quotaUpdate: Record<string, string> = {
        adjustmentsTotal: toDecimal(newAdjTotal),
        balance: toDecimal(newBalance),
        status: newStatus,
      }
      if (adjustmentType === 'exoneration') {
        quotaUpdate.interestAmount = '0'
      }
      await txQuotasRepo.update(quotaId, quotaUpdate)

      // Build message
      const diff = newAmountNum - parseAmount(currentEffective)
      const diffStr = diff > 0 ? `+${toDecimal(diff)}` : toDecimal(diff)
      const message = `Quota adjusted from ${currentEffective} to ${newAmount} (${diffStr}). Reason: ${reason}`

      return success({ adjustment, message })
    })
  }
}
