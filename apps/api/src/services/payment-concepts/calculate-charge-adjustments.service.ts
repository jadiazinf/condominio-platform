import type { TPaymentConcept } from '@packages/domain'

type TQuotaInfo = {
  baseAmount: number
  balance: number
  dueDate: Date
}

export class CalculateChargeAdjustmentsService {
  /**
   * Calculates the late fee surcharge for a quota based on the concept's config.
   * Applied to the remaining balance, not the original amount.
   */
  calculateLateFee(concept: TPaymentConcept, quota: TQuotaInfo, paymentDate: Date): number {
    if (concept.latePaymentType === 'none' || concept.latePaymentValue == null) {
      return 0
    }

    const daysOverdue = this.daysBetween(quota.dueDate, paymentDate)
    if (daysOverdue <= 0) {
      return 0
    }

    // Within grace period
    if (daysOverdue <= concept.latePaymentGraceDays) {
      return 0
    }

    if (concept.latePaymentType === 'percentage') {
      return this.roundCurrency(quota.balance * (concept.latePaymentValue / 100))
    }

    // fixed
    return concept.latePaymentValue
  }

  /**
   * Calculates the early payment discount for a quota.
   * Discount is capped at the remaining balance.
   */
  calculateEarlyDiscount(concept: TPaymentConcept, quota: TQuotaInfo, paymentDate: Date): number {
    if (concept.earlyPaymentType === 'none' || concept.earlyPaymentValue == null) {
      return 0
    }

    const daysBeforeDue = this.daysBetween(paymentDate, quota.dueDate)

    // Must pay at least earlyPaymentDaysBeforeDue days before due date (inclusive)
    if (daysBeforeDue < concept.earlyPaymentDaysBeforeDue) {
      return 0
    }

    let discount: number

    if (concept.earlyPaymentType === 'percentage') {
      discount = this.roundCurrency(quota.balance * (concept.earlyPaymentValue / 100))
    } else {
      discount = concept.earlyPaymentValue
    }

    // Cap at balance
    return Math.min(discount, quota.balance)
  }

  private daysBetween(start: Date, end: Date): number {
    const msPerDay = 24 * 60 * 60 * 1000
    return Math.floor((end.getTime() - start.getTime()) / msPerDay)
  }

  private roundCurrency(amount: number): number {
    return Math.round(amount * 100) / 100
  }
}
