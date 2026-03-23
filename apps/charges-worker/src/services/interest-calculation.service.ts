import type { TInterestConfiguration, TQuota } from '@packages/domain'
import { parseAmount, roundCurrency, toDecimal } from '@packages/utils/money'

export interface IInterestResult {
  quotaId: string
  previousInterest: string
  calculatedInterest: number
  newInterest: string
  newBalance: string
  daysOverdue: number
}

/**
 * Calculates interest for overdue quotas based on interest configurations.
 *
 * Supports three interest types:
 * - simple: outstandingPrincipal * rate * daysOverdue / daysInPeriod
 * - compound: outstandingPrincipal * ((1 + rate)^periods - 1)
 * - fixed_amount: fixed amount per overdue period
 *
 * Interest is calculated on outstanding principal (effectiveAmount - paidAmount),
 * NOT on balance (which includes previously accrued interest). This prevents
 * double-compounding where interest is charged on top of already-applied interest.
 *
 * Grace period is respected: no interest calculated within grace days after due date.
 */
export class InterestCalculationService {
  /**
   * Calculate interest for a single overdue quota.
   * Returns null if no interest should be applied (grace period, zero balance, etc.)
   */
  calculate(
    quota: TQuota,
    config: TInterestConfiguration,
    today: Date = new Date()
  ): IInterestResult | null {
    const balance = parseAmount(quota.balance)
    if (balance <= 0) return null

    const dueDate = new Date(quota.dueDate)
    const daysOverdue = this.daysBetween(dueDate, today)

    if (daysOverdue <= 0) return null

    // Respect grace period
    const graceDays = config.gracePeriodDays ?? 0
    if (daysOverdue <= graceDays) return null

    const effectiveDaysOverdue = daysOverdue - graceDays
    const previousInterest = quota.interestAmount ?? '0'
    const previousInterestNum = parseAmount(previousInterest)

    // Calculate outstanding principal: effectiveAmount - paidAmount (excludes interest)
    // This prevents double-compounding where interest would be charged on prior interest
    const baseAmount = parseAmount(quota.baseAmount)
    const adjustmentsTotal = parseAmount(quota.adjustmentsTotal)
    const effectiveAmount = baseAmount + adjustmentsTotal
    const paidAmount = parseAmount(quota.paidAmount)
    const outstandingPrincipal = Math.max(0, effectiveAmount - paidAmount)

    if (outstandingPrincipal <= 0) return null

    let calculatedInterest: number

    // per_overdue_quota: apply interest exactly once (1 period), not scaled by days
    const isPerQuota = config.calculationPeriod === 'per_overdue_quota'

    switch (config.interestType) {
      case 'simple': {
        const rate = parseAmount(config.interestRate)
        if (rate <= 0) return null
        if (isPerQuota) {
          calculatedInterest = outstandingPrincipal * rate
        } else {
          const daysInPeriod = this.getDaysInPeriod(config.calculationPeriod)
          calculatedInterest = (outstandingPrincipal * rate * effectiveDaysOverdue) / daysInPeriod
        }
        break
      }
      case 'compound': {
        const rate = parseAmount(config.interestRate)
        if (rate <= 0) return null
        if (isPerQuota) {
          calculatedInterest = outstandingPrincipal * rate
        } else {
          const daysInPeriod = this.getDaysInPeriod(config.calculationPeriod)
          const periods = effectiveDaysOverdue / daysInPeriod
          calculatedInterest = outstandingPrincipal * (Math.pow(1 + rate, periods) - 1)
        }
        break
      }
      case 'fixed_amount': {
        const fixedAmount = parseAmount(config.fixedAmount)
        if (fixedAmount <= 0) return null
        if (isPerQuota) {
          calculatedInterest = fixedAmount
        } else {
          const daysInPeriod = this.getDaysInPeriod(config.calculationPeriod)
          const periods = Math.floor(effectiveDaysOverdue / daysInPeriod)
          if (periods <= 0) return null
          calculatedInterest = fixedAmount * periods
        }
        break
      }
      default:
        return null
    }

    // Round to 2 decimal places
    calculatedInterest = roundCurrency(calculatedInterest)

    // Safety cap: interest cannot exceed the outstanding principal.
    // Prevents runaway compound interest for long-overdue quotas.
    if (calculatedInterest > outstandingPrincipal) {
      calculatedInterest = outstandingPrincipal
    }

    if (calculatedInterest <= 0) return null

    // Only apply if calculated interest exceeds previously applied interest
    // This prevents double-counting: we calculate total interest, not incremental
    if (calculatedInterest <= previousInterestNum) return null

    const incrementalInterest = roundCurrency(calculatedInterest - previousInterestNum)
    if (incrementalInterest <= 0) return null

    const newInterest = calculatedInterest
    // Ensure balance never goes negative from interest calculation
    const newBalance = Math.max(0, roundCurrency(effectiveAmount + newInterest - paidAmount))

    return {
      quotaId: quota.id,
      previousInterest,
      calculatedInterest: incrementalInterest,
      newInterest: toDecimal(newInterest),
      newBalance: toDecimal(newBalance),
      daysOverdue: effectiveDaysOverdue,
    }
  }

  /**
   * Find the most specific interest configuration for a quota.
   * Priority: concept-level > building-level > condominium-level
   */
  findApplicableConfig(
    configs: TInterestConfiguration[],
    paymentConceptId: string,
    buildingId: string | null,
    asOfDate?: Date
  ): TInterestConfiguration | null {
    const isEffective = (c: TInterestConfiguration): boolean => {
      if (!c.isActive) return false
      if (!asOfDate) return true
      const dateStr = asOfDate.toISOString().split('T')[0]!
      if (c.effectiveFrom && c.effectiveFrom > dateStr) return false
      if (c.effectiveTo && c.effectiveTo < dateStr) return false
      return true
    }

    // Most specific: concept-level
    const conceptConfig = configs.find(
      c => c.paymentConceptId === paymentConceptId && isEffective(c)
    )
    if (conceptConfig) return conceptConfig

    // Building-level
    if (buildingId) {
      const buildingConfig = configs.find(
        c => c.buildingId === buildingId && !c.paymentConceptId && isEffective(c)
      )
      if (buildingConfig) return buildingConfig
    }

    // Condominium-level (most general)
    const condoConfig = configs.find(c => !c.paymentConceptId && !c.buildingId && isEffective(c))
    return condoConfig ?? null
  }

  private daysBetween(from: Date, to: Date): number {
    const msPerDay = 24 * 60 * 60 * 1000
    return Math.floor((to.getTime() - from.getTime()) / msPerDay)
  }

  private getDaysInPeriod(calculationPeriod: string | null): number {
    switch (calculationPeriod) {
      case 'daily':
        return 1
      case 'weekly':
        return 7
      case 'biweekly':
        return 14
      case 'monthly':
        return 30
      case 'quarterly':
        return 90
      case 'semi_annual':
        return 180
      case 'annual':
        return 360
      default:
        return 30 // Default to monthly
    }
  }
}
