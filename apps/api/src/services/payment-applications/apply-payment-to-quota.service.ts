import { sql } from 'drizzle-orm'
import type { TPaymentApplication, TPaymentApplicationCreate } from '@packages/domain'
import type {
  PaymentApplicationsRepository,
  PaymentsRepository,
  QuotasRepository,
  QuotaAdjustmentsRepository,
  InterestConfigurationsRepository,
  PaymentPendingAllocationsRepository,
  PaymentConceptsRepository,
} from '@database/repositories'
import type { TDrizzleClient } from '@database/repositories/interfaces'
import type { EventLogger } from '@packages/services'
import { type TServiceResult, success, failure } from '../base.service'
import { parseAmount, roundCurrency, toDecimal, toCents } from '@packages/utils/money'

export interface IApplyPaymentToQuotaInput {
  paymentId: string
  quotaId: string
  appliedAmount: string
  registeredByUserId: string
}

export interface IApplyPaymentToQuotaOutput {
  application: TPaymentApplication
  quotaUpdated: boolean
  interestReversed: boolean
  earlyPaymentDiscountApplied: boolean
  latePaymentSurchargeApplied: boolean
  excessAmount: string | null
  message: string
}

/**
 * Applies a payment to a quota transactionally:
 * 1. Creates the payment_application record
 * 2. Applies early payment discount if payment is before the cutoff date (one-shot)
 * 3. Applies late payment surcharge if payment is after due + grace days (one-shot)
 * 4. If paymentDate <= dueDate, reverses wrongly-applied interest
 * 5. If paymentDate > dueDate, recalculates interest only up to payment date
 * 6. Updates the quota's paidAmount and balance
 * 7. Updates quota status to 'paid' if fully covered
 * 8. Creates audit trail via quota_adjustments
 */
export class ApplyPaymentToQuotaService {
  constructor(
    private readonly db: TDrizzleClient,
    private readonly paymentApplicationsRepo: PaymentApplicationsRepository,
    private readonly paymentsRepo: PaymentsRepository,
    private readonly quotasRepo: QuotasRepository,
    private readonly adjustmentsRepo: QuotaAdjustmentsRepository,
    private readonly interestConfigsRepo: InterestConfigurationsRepository,
    private readonly paymentConceptsRepo: PaymentConceptsRepository,
    private readonly pendingAllocationsRepo?: PaymentPendingAllocationsRepository,
    private readonly eventLogger?: EventLogger
  ) {}

  async execute(
    input: IApplyPaymentToQuotaInput
  ): Promise<TServiceResult<IApplyPaymentToQuotaOutput>> {
    const startTime = Date.now()
    const result = await this.executeInternal(input)
    const durationMs = Date.now() - startTime

    if (this.eventLogger) {
      if (result.success) {
        this.eventLogger.info({
          category: 'payment',
          event: 'payment.applied_to_quota',
          action: 'apply_payment',
          message: `Payment ${input.paymentId} applied to quota ${input.quotaId} (${input.appliedAmount})`,
          module: 'ApplyPaymentToQuotaService',
          entityType: 'payment',
          entityId: input.paymentId,
          userId: input.registeredByUserId,
          metadata: {
            quotaId: input.quotaId,
            appliedAmount: input.appliedAmount,
            interestReversed: result.data.interestReversed,
            earlyDiscount: result.data.earlyPaymentDiscountApplied,
            lateSurcharge: result.data.latePaymentSurchargeApplied,
            excessAmount: result.data.excessAmount,
          },
          durationMs,
        })
      } else {
        this.eventLogger.error({
          category: 'payment',
          event: 'payment.apply.failed',
          action: 'apply_payment',
          message: `Payment application failed: ${result.error}`,
          module: 'ApplyPaymentToQuotaService',
          entityType: 'payment',
          entityId: input.paymentId,
          userId: input.registeredByUserId,
          errorCode: result.code,
          errorMessage: result.error,
          metadata: { quotaId: input.quotaId },
          durationMs,
        })
      }
    }

    return result
  }

  private async executeInternal(
    input: IApplyPaymentToQuotaInput
  ): Promise<TServiceResult<IApplyPaymentToQuotaOutput>> {
    const { paymentId, quotaId, appliedAmount, registeredByUserId } = input

    // Validate payment exists and is completed
    const payment = await this.paymentsRepo.getById(paymentId)
    if (!payment) {
      return failure('Payment not found', 'NOT_FOUND')
    }
    if (payment.status !== 'completed') {
      return failure(
        `Payment must be completed before applying. Current status: ${payment.status}`,
        'BAD_REQUEST'
      )
    }

    // Validate quota exists
    const quota = await this.quotasRepo.getById(quotaId)
    if (!quota) {
      return failure('Quota not found', 'NOT_FOUND')
    }
    if (quota.status === 'paid') {
      return failure('Quota is already fully paid', 'BAD_REQUEST')
    }
    if (quota.status === 'cancelled') {
      return failure('Cannot apply payment to a cancelled quota', 'BAD_REQUEST')
    }
    if (quota.status === 'exonerated') {
      return failure('Cannot apply payment to an exonerated quota', 'BAD_REQUEST')
    }

    // Validate currency match
    if (payment.currencyId !== quota.currencyId) {
      return failure(
        `Currency mismatch: payment currency (${payment.currencyId}) does not match quota currency (${quota.currencyId}). ` +
          `Convert the payment to the quota's currency before applying.`,
        'BAD_REQUEST'
      )
    }

    // Enforce chronological payment order — oldest unpaid quotas first (per concept)
    const unpaidQuotas = await this.quotasRepo.getUnpaidByConceptAndUnit(
      quota.paymentConceptId,
      quota.unitId
    )
    const olderUnpaid = unpaidQuotas.filter(
      q => q.id !== quotaId && new Date(q.dueDate) < new Date(quota.dueDate)
    )
    if (olderUnpaid.length > 0) {
      const oldestDue = olderUnpaid[0]!
      const periodLabel = oldestDue.periodMonth
        ? `${oldestDue.periodMonth}/${oldestDue.periodYear}`
        : `${oldestDue.periodYear}`
      return failure(
        `No se puede aplicar pago a esta cuota porque existen ${olderUnpaid.length} cuota(s) anteriores pendientes del mismo concepto. ` +
          `La cuota más antigua pendiente es del período ${periodLabel} (vence: ${oldestDue.dueDate}). ` +
          `Debe pagar las cuotas más antiguas primero.`,
        'BAD_REQUEST'
      )
    }

    const applied = parseAmount(appliedAmount)
    if (applied <= 0) {
      return failure('Applied amount must be a positive number', 'BAD_REQUEST')
    }

    // Validate remaining unapplied balance — prevent double-spending
    // Use integer cents to avoid floating-point accumulation errors
    const existingApplications = await this.paymentApplicationsRepo.getByPaymentId(paymentId)
    const totalAlreadyAppliedCents = existingApplications.reduce(
      (sum, app) => sum + toCents(app.appliedAmount),
      0
    )
    const paymentTotalCents = toCents(payment.amount)
    const appliedCents = toCents(applied)
    const remainingUnappliedCents = paymentTotalCents - totalAlreadyAppliedCents

    const paymentTotal = paymentTotalCents / 100
    const totalAlreadyApplied = totalAlreadyAppliedCents / 100
    const remainingUnapplied = remainingUnappliedCents / 100

    if (appliedCents > remainingUnappliedCents) {
      return failure(
        `El monto a aplicar (${toDecimal(applied)}) excede el saldo disponible del pago (${toDecimal(remainingUnapplied)}). ` +
          `Pago total: ${toDecimal(paymentTotal)}, ya aplicado: ${toDecimal(totalAlreadyApplied)}.`,
        'BAD_REQUEST'
      )
    }

    // Load payment concept for early/late payment configuration
    const concept = await this.paymentConceptsRepo.getById(quota.paymentConceptId)

    // Check existing adjustments to determine if discount/surcharge already applied (idempotency)
    const existingAdjustments = await this.adjustmentsRepo.getByQuotaId(quotaId)
    const hasEarlyDiscount = existingAdjustments.some(a => a.tag === 'early_discount')
    const hasLateSurcharge = existingAdjustments.some(a => a.tag === 'late_surcharge')

    const baseAmount = parseAmount(quota.baseAmount)
    const currentAdjTotal = parseAmount(quota.adjustmentsTotal)
    let currentEffective = baseAmount + currentAdjTotal
    const currentInterest = parseAmount(quota.interestAmount)
    const currentPaid = parseAmount(quota.paidAmount)
    const paymentDate = new Date(payment.paymentDate)
    const dueDate = new Date(quota.dueDate)
    const paymentOnTime = paymentDate <= dueDate

    // Calculate early payment discount or late payment surcharge
    let earlyPaymentDiscountApplied = false
    let latePaymentSurchargeApplied = false
    let earlyDiscountAmount = 0
    let lateSurchargeAmount = 0

    if (concept) {
      // Early payment discount (one-shot, only on first payment application)
      if (
        !hasEarlyDiscount &&
        concept.earlyPaymentType !== 'none' &&
        concept.earlyPaymentValue != null &&
        concept.earlyPaymentValue > 0 &&
        concept.earlyPaymentDaysBeforeDue > 0 &&
        existingApplications.length === 0 // Only apply on first payment to this quota
      ) {
        const discountCutoffDate = new Date(dueDate)
        discountCutoffDate.setDate(discountCutoffDate.getDate() - concept.earlyPaymentDaysBeforeDue)

        if (paymentDate <= discountCutoffDate) {
          earlyDiscountAmount = this.calculateAdjustmentAmount(
            concept.earlyPaymentType,
            concept.earlyPaymentValue,
            baseAmount
          )
          earlyPaymentDiscountApplied = true
        }
      }

      // Late payment surcharge (one-shot, only when payment is late)
      if (
        !hasLateSurcharge &&
        !paymentOnTime &&
        concept.latePaymentType !== 'none' &&
        concept.latePaymentValue != null &&
        concept.latePaymentValue > 0
      ) {
        const graceDays = concept.latePaymentGraceDays ?? 0
        const surchargeStartDate = new Date(dueDate)
        surchargeStartDate.setDate(surchargeStartDate.getDate() + graceDays)

        if (paymentDate > surchargeStartDate) {
          lateSurchargeAmount = this.calculateAdjustmentAmount(
            concept.latePaymentType,
            concept.latePaymentValue,
            baseAmount
          )
          latePaymentSurchargeApplied = true
        }
      }
    }

    // Effective amount for balance calculation (original base + existing adjustments + new adjustments)
    const effectiveBaseAmount = currentEffective - earlyDiscountAmount + lateSurchargeAmount

    // Determine if interest should be recalculated
    let interestReversed = false
    let newInterest = currentInterest

    if (paymentOnTime && currentInterest > 0) {
      // Payment was on time but reported late — reverse all interest
      newInterest = 0
      interestReversed = true
    } else if (!paymentOnTime && currentInterest > 0) {
      // Payment was late — recalculate interest only up to payment date
      const config = await this.interestConfigsRepo.getActiveForDate(
        quota.paymentConceptId,
        payment.paymentDate
      )
      if (config) {
        const recalculated = this.calculateInterestUpToDate(
          baseAmount,
          dueDate,
          paymentDate,
          config
        )
        if (recalculated < currentInterest) {
          newInterest = recalculated
          interestReversed = true
        }
      }
    }

    // Split payment between interest (first) and principal
    let appliedToInterest = 0
    let remaining = applied

    if (newInterest > 0) {
      appliedToInterest = Math.min(remaining, newInterest)
      remaining -= appliedToInterest
    }
    const appliedToPrincipal = remaining

    // New totals — use effectiveBaseAmount which includes discount/surcharge adjustments
    const newPaid = roundCurrency(currentPaid + applied)
    const newBalance = roundCurrency(effectiveBaseAmount + newInterest - newPaid)
    const newStatus =
      newBalance <= 0 ? ('paid' as const) : newPaid > 0 ? ('partial' as const) : quota.status

    // Execute everything in a transaction
    return await this.db.transaction(async tx => {
      // Lock the quota row to prevent race with interest calculation worker
      await tx.execute(sql`SELECT id FROM quotas WHERE id = ${quotaId} FOR UPDATE`)

      const txAppsRepo = this.paymentApplicationsRepo.withTx(tx)
      const txQuotasRepo = this.quotasRepo.withTx(tx)
      const txAdjRepo = this.adjustmentsRepo.withTx(tx)

      // 1. Apply early payment discount (one-shot adjustment)
      // NOTE: baseAmount is IMMUTABLE — adjustments are tracked via adjustmentsTotal
      if (earlyPaymentDiscountApplied) {
        await txAdjRepo.create({
          quotaId,
          previousAmount: toDecimal(currentEffective),
          newAmount: toDecimal(currentEffective - earlyDiscountAmount),
          adjustmentType: 'discount',
          reason:
            `Descuento por pronto pago: ${concept!.earlyPaymentType === 'percentage' ? `${concept!.earlyPaymentValue}%` : toDecimal(concept!.earlyPaymentValue!)} aplicado. ` +
            `Pago recibido el ${payment.paymentDate}, antes del corte (${concept!.earlyPaymentDaysBeforeDue} días antes del vencimiento ${quota.dueDate}).`,
          tag: 'early_discount',
          createdBy: registeredByUserId,
        })
        currentEffective -= earlyDiscountAmount
      }

      // 2. Apply late payment surcharge (one-shot adjustment)
      if (latePaymentSurchargeApplied) {
        await txAdjRepo.create({
          quotaId,
          previousAmount: toDecimal(currentEffective),
          newAmount: toDecimal(currentEffective + lateSurchargeAmount),
          adjustmentType: 'increase',
          reason:
            `Recargo por mora: ${concept!.latePaymentType === 'percentage' ? `${concept!.latePaymentValue}%` : toDecimal(concept!.latePaymentValue!)} aplicado. ` +
            `Pago recibido el ${payment.paymentDate}, después del período de gracia (${concept!.latePaymentGraceDays} días después del vencimiento ${quota.dueDate}).`,
          tag: 'late_surcharge',
          createdBy: registeredByUserId,
        })
        currentEffective += lateSurchargeAmount
      }

      // 3. Create payment application
      const appData: TPaymentApplicationCreate = {
        paymentId,
        quotaId,
        appliedAmount,
        appliedToPrincipal: toDecimal(appliedToPrincipal),
        appliedToInterest: toDecimal(appliedToInterest),
        registeredBy: registeredByUserId,
      }
      const application = await txAppsRepo.create(appData)

      // 4. Update quota (baseAmount is NEVER mutated)
      const quotaUpdate: Record<string, string> = {
        paidAmount: toDecimal(newPaid),
        interestAmount: toDecimal(newInterest),
        balance: toDecimal(newBalance),
        status: newStatus,
      }
      if (earlyPaymentDiscountApplied || latePaymentSurchargeApplied) {
        const newAdjTotal = currentAdjTotal - earlyDiscountAmount + lateSurchargeAmount
        quotaUpdate.adjustmentsTotal = toDecimal(newAdjTotal)
      }
      await txQuotasRepo.update(quotaId, quotaUpdate)

      // 5. Audit trail for interest changes
      if (interestReversed) {
        await txAdjRepo.create({
          quotaId,
          previousAmount: toDecimal(currentInterest),
          newAmount: toDecimal(newInterest),
          adjustmentType: 'correction',
          reason: paymentOnTime
            ? `Interest reversed: payment date (${payment.paymentDate}) was on or before due date (${quota.dueDate}). Interest of ${toDecimal(currentInterest)} fully reversed.`
            : `Interest recalculated to payment date (${payment.paymentDate}): reduced from ${toDecimal(currentInterest)} to ${toDecimal(newInterest)}.`,
          createdBy: registeredByUserId,
        })
      }

      // 6. Detect excess payment (overpayment) and create pending allocation
      let excessAmount: string | null = null
      if (newBalance < 0 && this.pendingAllocationsRepo) {
        excessAmount = toDecimal(Math.abs(newBalance))
        const txPendingRepo = this.pendingAllocationsRepo.withTx(tx)
        await txPendingRepo.create({
          paymentId,
          pendingAmount: excessAmount,
          currencyId: payment.currencyId,
          status: 'pending',
        })
      }

      return success({
        application,
        quotaUpdated: true,
        interestReversed,
        earlyPaymentDiscountApplied,
        latePaymentSurchargeApplied,
        excessAmount,
        message:
          newBalance < 0
            ? `Payment applied. Quota is now fully paid. Excess of ${toDecimal(Math.abs(newBalance))} pending resolution.`
            : newStatus === 'paid'
              ? 'Payment applied. Quota is now fully paid.'
              : `Payment applied. Remaining balance: ${toDecimal(newBalance)}`,
      })
    })
  }

  /**
   * Calculates the adjustment amount based on type (percentage or fixed).
   * Returns the absolute amount to add/subtract.
   */
  private calculateAdjustmentAmount(
    type: 'percentage' | 'fixed' | 'none',
    value: number,
    baseAmount: number
  ): number {
    switch (type) {
      case 'percentage':
        return roundCurrency((baseAmount * value) / 100)
      case 'fixed':
        return roundCurrency(value)
      default:
        return 0
    }
  }

  /**
   * Calculates interest from dueDate to paymentDate using the interest configuration.
   * This is a simplified calculation for retroactive adjustment — the worker's
   * InterestCalculationService handles the full daily recalculation.
   */
  private calculateInterestUpToDate(
    baseAmount: number,
    dueDate: Date,
    paymentDate: Date,
    config: {
      interestType: string
      interestRate: string | null
      fixedAmount: string | null
      gracePeriodDays: number | null
      calculationPeriod: string | null
    }
  ): number {
    const msPerDay = 24 * 60 * 60 * 1000
    const daysOverdue = Math.floor((paymentDate.getTime() - dueDate.getTime()) / msPerDay)
    if (daysOverdue <= 0) return 0

    const graceDays = config.gracePeriodDays ?? 0
    if (daysOverdue <= graceDays) return 0

    const effectiveDays = daysOverdue - graceDays
    const daysInPeriod = this.getDaysInPeriod(config.calculationPeriod)

    switch (config.interestType) {
      case 'simple': {
        const rate = parseAmount(config.interestRate)
        if (rate <= 0) return 0
        return roundCurrency((baseAmount * rate * effectiveDays) / daysInPeriod)
      }
      case 'compound': {
        const rate = parseAmount(config.interestRate)
        if (rate <= 0) return 0
        const periods = effectiveDays / daysInPeriod
        return roundCurrency(baseAmount * (Math.pow(1 + rate, periods) - 1))
      }
      case 'fixed_amount': {
        const fixedAmt = parseAmount(config.fixedAmount)
        if (fixedAmt <= 0) return 0
        const periods = Math.floor(effectiveDays / daysInPeriod)
        return periods > 0 ? roundCurrency(fixedAmt * periods) : 0
      }
      default:
        return 0
    }
  }

  private getDaysInPeriod(period: string | null): number {
    switch (period) {
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
        return 30
    }
  }
}
