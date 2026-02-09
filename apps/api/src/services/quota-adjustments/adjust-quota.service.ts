import type { TQuotaAdjustment, TAdjustmentType, TQuotaStatus } from '@packages/domain'
import type { QuotasRepository, QuotaAdjustmentsRepository } from '@database/repositories'
import type { TDrizzleClient } from '@database/repositories/interfaces'
import { type TServiceResult, success, failure } from '../base.service'

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

    // 2. Validate: can't adjust cancelled quotas
    if (quota.status === 'cancelled') {
      return failure('Cannot adjust a cancelled quota', 'BAD_REQUEST')
    }

    // 3. Validate: new amount must be different
    if (quota.baseAmount === newAmount) {
      return failure('New amount must be different from current amount', 'BAD_REQUEST')
    }

    // 4. Validate: new amount must be positive (unless waiver)
    const newAmountNum = parseFloat(newAmount)
    if (adjustmentType !== 'waiver' && newAmountNum < 0) {
      return failure('New amount cannot be negative', 'BAD_REQUEST')
    }

    // 5. For waiver, new amount must be 0
    if (adjustmentType === 'waiver' && newAmountNum !== 0) {
      return failure('Waiver adjustment must set amount to 0', 'BAD_REQUEST')
    }

    // 6. Calculate new balance
    const paidAmount = parseFloat(quota.paidAmount || '0')
    const interestAmount = parseFloat(quota.interestAmount || '0')
    const newBalance = newAmountNum + interestAmount - paidAmount

    // 7. Determine new status
    let newStatus: TQuotaStatus = quota.status
    if (adjustmentType === 'waiver') {
      newStatus = 'cancelled'
    } else if (newBalance <= 0) {
      newStatus = 'paid'
    }

    // 8. All writes inside a transaction for atomicity
    return await this.db.transaction(async (tx) => {
      const txAdjustmentsRepo = this.quotaAdjustmentsRepository.withTx(tx)
      const txQuotasRepo = this.quotasRepository.withTx(tx)

      // Create the adjustment record
      const adjustment = await txAdjustmentsRepo.create({
        quotaId,
        previousAmount: quota.baseAmount,
        newAmount,
        adjustmentType,
        reason,
        createdBy: adjustedByUserId,
      })

      // Update the quota
      await txQuotasRepo.update(quotaId, {
        baseAmount: newAmount,
        balance: newBalance.toFixed(2),
        status: newStatus,
      })

      // Build message
      const diff = newAmountNum - parseFloat(quota.baseAmount)
      const diffStr = diff > 0 ? `+${diff.toFixed(2)}` : diff.toFixed(2)
      const message = `Quota adjusted from ${quota.baseAmount} to ${newAmount} (${diffStr}). Reason: ${reason}`

      return success({ adjustment, message })
    })
  }
}
