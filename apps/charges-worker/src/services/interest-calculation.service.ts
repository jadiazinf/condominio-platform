import type { TInterestConfiguration, TQuota } from '@packages/domain'

const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000000'

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
 * - simple: balance * rate * daysOverdue / daysInPeriod
 * - compound: balance * ((1 + rate)^periods - 1)
 * - fixed_amount: fixed amount per overdue period
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
    today: Date = new Date(),
  ): IInterestResult | null {
    const balance = parseFloat(quota.balance)
    if (balance <= 0) return null

    const dueDate = new Date(quota.dueDate)
    const daysOverdue = this.daysBetween(dueDate, today)

    if (daysOverdue <= 0) return null

    // Respect grace period
    const graceDays = config.gracePeriodDays ?? 0
    if (daysOverdue <= graceDays) return null

    const effectiveDaysOverdue = daysOverdue - graceDays
    const previousInterest = quota.interestAmount ?? '0'
    const previousInterestNum = parseFloat(previousInterest)

    let calculatedInterest: number

    switch (config.interestType) {
      case 'simple': {
        const rate = parseFloat(config.interestRate ?? '0')
        if (rate <= 0) return null
        const daysInPeriod = this.getDaysInPeriod(config.calculationPeriod)
        calculatedInterest = balance * rate * effectiveDaysOverdue / daysInPeriod
        break
      }
      case 'compound': {
        const rate = parseFloat(config.interestRate ?? '0')
        if (rate <= 0) return null
        const daysInPeriod = this.getDaysInPeriod(config.calculationPeriod)
        const periods = effectiveDaysOverdue / daysInPeriod
        calculatedInterest = balance * (Math.pow(1 + rate, periods) - 1)
        break
      }
      case 'fixed_amount': {
        const fixedAmount = parseFloat(config.fixedAmount ?? '0')
        if (fixedAmount <= 0) return null
        const daysInPeriod = this.getDaysInPeriod(config.calculationPeriod)
        const periods = Math.floor(effectiveDaysOverdue / daysInPeriod)
        if (periods <= 0) return null
        calculatedInterest = fixedAmount * periods
        break
      }
      default:
        return null
    }

    // Round to 2 decimal places
    calculatedInterest = Math.round(calculatedInterest * 100) / 100

    if (calculatedInterest <= 0) return null

    // Only apply if calculated interest exceeds previously applied interest
    // This prevents double-counting: we calculate total interest, not incremental
    if (calculatedInterest <= previousInterestNum) return null

    const incrementalInterest = Math.round((calculatedInterest - previousInterestNum) * 100) / 100
    if (incrementalInterest <= 0) return null

    const newInterest = calculatedInterest
    const baseAmount = parseFloat(quota.baseAmount)
    const paidAmount = parseFloat(quota.paidAmount ?? '0')
    const newBalance = Math.round((baseAmount + newInterest - paidAmount) * 100) / 100

    return {
      quotaId: quota.id,
      previousInterest,
      calculatedInterest: incrementalInterest,
      newInterest: newInterest.toFixed(2),
      newBalance: newBalance.toFixed(2),
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
  ): TInterestConfiguration | null {
    // Most specific: concept-level
    const conceptConfig = configs.find(c => c.paymentConceptId === paymentConceptId && c.isActive)
    if (conceptConfig) return conceptConfig

    // Building-level
    if (buildingId) {
      const buildingConfig = configs.find(c => c.buildingId === buildingId && !c.paymentConceptId && c.isActive)
      if (buildingConfig) return buildingConfig
    }

    // Condominium-level (most general)
    const condoConfig = configs.find(c => !c.paymentConceptId && !c.buildingId && c.isActive)
    return condoConfig ?? null
  }

  private daysBetween(from: Date, to: Date): number {
    const msPerDay = 24 * 60 * 60 * 1000
    return Math.floor((to.getTime() - from.getTime()) / msPerDay)
  }

  private getDaysInPeriod(calculationPeriod: string | null): number {
    switch (calculationPeriod) {
      case 'daily': return 1
      case 'weekly': return 7
      case 'biweekly': return 14
      case 'monthly': return 30
      case 'quarterly': return 90
      case 'semi_annual': return 180
      case 'annual': return 360
      default: return 30 // Default to monthly
    }
  }
}
