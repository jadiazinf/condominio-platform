import type { TPaymentApplication, TPaymentApplicationCreate } from '@packages/domain'
import type {
  PaymentApplicationsRepository,
  PaymentsRepository,
  QuotasRepository,
  QuotaAdjustmentsRepository,
  InterestConfigurationsRepository,
  PaymentPendingAllocationsRepository,
} from '@database/repositories'
import type { TDrizzleClient } from '@database/repositories/interfaces'
import { type TServiceResult, success, failure } from '../base.service'

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
  excessAmount: string | null
  message: string
}

/**
 * Applies a payment to a quota transactionally:
 * 1. Creates the payment_application record
 * 2. Updates the quota's paidAmount and balance
 * 3. If paymentDate <= dueDate, reverses wrongly-applied interest
 * 4. If paymentDate > dueDate, recalculates interest only up to payment date
 * 5. Updates quota status to 'paid' if fully covered
 * 6. Creates audit trail via quota_adjustments
 */
export class ApplyPaymentToQuotaService {
  constructor(
    private readonly db: TDrizzleClient,
    private readonly paymentApplicationsRepo: PaymentApplicationsRepository,
    private readonly paymentsRepo: PaymentsRepository,
    private readonly quotasRepo: QuotasRepository,
    private readonly adjustmentsRepo: QuotaAdjustmentsRepository,
    private readonly interestConfigsRepo: InterestConfigurationsRepository,
    private readonly pendingAllocationsRepo?: PaymentPendingAllocationsRepository,
  ) {}

  async execute(input: IApplyPaymentToQuotaInput): Promise<TServiceResult<IApplyPaymentToQuotaOutput>> {
    const { paymentId, quotaId, appliedAmount, registeredByUserId } = input

    // Validate payment exists and is completed
    const payment = await this.paymentsRepo.getById(paymentId)
    if (!payment) {
      return failure('Payment not found', 'NOT_FOUND')
    }
    if (payment.status !== 'completed') {
      return failure(`Payment must be completed before applying. Current status: ${payment.status}`, 'BAD_REQUEST')
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

    // Enforce chronological payment order — oldest unpaid quotas first (per concept)
    const unpaidQuotas = await this.quotasRepo.getUnpaidByConceptAndUnit(
      quota.paymentConceptId,
      quota.unitId
    )
    const olderUnpaid = unpaidQuotas.filter(q =>
      q.id !== quotaId && new Date(q.dueDate) < new Date(quota.dueDate)
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

    const applied = parseFloat(appliedAmount)
    if (isNaN(applied) || applied <= 0) {
      return failure('Applied amount must be a positive number', 'BAD_REQUEST')
    }

    // Validate remaining unapplied balance — prevent double-spending
    // Use integer cents to avoid floating-point accumulation errors
    const existingApplications = await this.paymentApplicationsRepo.getByPaymentId(paymentId)
    const totalAlreadyAppliedCents = existingApplications.reduce(
      (sum, app) => sum + Math.round(parseFloat(app.appliedAmount) * 100), 0
    )
    const paymentTotalCents = Math.round(parseFloat(payment.amount) * 100)
    const appliedCents = Math.round(applied * 100)
    const remainingUnappliedCents = paymentTotalCents - totalAlreadyAppliedCents

    const paymentTotal = paymentTotalCents / 100
    const totalAlreadyApplied = totalAlreadyAppliedCents / 100
    const remainingUnapplied = remainingUnappliedCents / 100

    if (appliedCents > remainingUnappliedCents) {
      return failure(
        `El monto a aplicar (${applied.toFixed(2)}) excede el saldo disponible del pago (${remainingUnapplied.toFixed(2)}). ` +
        `Pago total: ${paymentTotal.toFixed(2)}, ya aplicado: ${totalAlreadyApplied.toFixed(2)}.`,
        'BAD_REQUEST'
      )
    }

    const baseAmount = parseFloat(quota.baseAmount)
    const currentInterest = parseFloat(quota.interestAmount ?? '0')
    const currentPaid = parseFloat(quota.paidAmount ?? '0')
    const paymentDate = new Date(payment.paymentDate)
    const dueDate = new Date(quota.dueDate)

    // Determine if interest should be recalculated
    let interestReversed = false
    let newInterest = currentInterest
    const paymentOnTime = paymentDate <= dueDate

    if (paymentOnTime && currentInterest > 0) {
      // Payment was on time but reported late — reverse all interest
      newInterest = 0
      interestReversed = true
    } else if (!paymentOnTime && currentInterest > 0) {
      // Payment was late — recalculate interest only up to payment date
      const config = await this.interestConfigsRepo.getActiveForDate(
        quota.paymentConceptId,
        payment.paymentDate,
      )
      if (config) {
        const recalculated = this.calculateInterestUpToDate(
          baseAmount, dueDate, paymentDate, config,
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

    // New totals
    const newPaid = Math.round((currentPaid + applied) * 100) / 100
    const newBalance = Math.round((baseAmount + newInterest - newPaid) * 100) / 100
    const newStatus = newBalance <= 0 ? 'paid' as const : quota.status

    // Execute everything in a transaction
    return await this.db.transaction(async (tx) => {
      const txAppsRepo = this.paymentApplicationsRepo.withTx(tx)
      const txQuotasRepo = this.quotasRepo.withTx(tx)
      const txAdjRepo = this.adjustmentsRepo.withTx(tx)

      // 1. Create payment application
      const appData: TPaymentApplicationCreate = {
        paymentId,
        quotaId,
        appliedAmount,
        appliedToPrincipal: appliedToPrincipal.toFixed(2),
        appliedToInterest: appliedToInterest.toFixed(2),
        registeredBy: registeredByUserId,
      }
      const application = await txAppsRepo.create(appData)

      // 2. Update quota
      await txQuotasRepo.update(quotaId, {
        paidAmount: newPaid.toFixed(2),
        interestAmount: newInterest.toFixed(2),
        balance: newBalance.toFixed(2),
        status: newStatus,
      })

      // 3. Audit trail for interest changes
      if (interestReversed) {
        await txAdjRepo.create({
          quotaId,
          previousAmount: currentInterest.toFixed(2),
          newAmount: newInterest.toFixed(2),
          adjustmentType: 'correction',
          reason: paymentOnTime
            ? `Interest reversed: payment date (${payment.paymentDate}) was on or before due date (${quota.dueDate}). Interest of ${currentInterest.toFixed(2)} fully reversed.`
            : `Interest recalculated to payment date (${payment.paymentDate}): reduced from ${currentInterest.toFixed(2)} to ${newInterest.toFixed(2)}.`,
          createdBy: registeredByUserId,
        })
      }

      // 4. Detect excess payment (overpayment) and create pending allocation
      let excessAmount: string | null = null
      if (newBalance < 0 && this.pendingAllocationsRepo) {
        excessAmount = Math.abs(newBalance).toFixed(2)
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
        excessAmount,
        message: newBalance < 0
          ? `Payment applied. Quota is now fully paid. Excess of ${Math.abs(newBalance).toFixed(2)} pending resolution.`
          : newStatus === 'paid'
            ? 'Payment applied. Quota is now fully paid.'
            : `Payment applied. Remaining balance: ${newBalance.toFixed(2)}`,
      })
    })
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
    config: { interestType: string; interestRate: string | null; fixedAmount: string | null; gracePeriodDays: number | null; calculationPeriod: string | null },
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
        const rate = parseFloat(config.interestRate ?? '0')
        if (rate <= 0) return 0
        return Math.round(baseAmount * rate * effectiveDays / daysInPeriod * 100) / 100
      }
      case 'compound': {
        const rate = parseFloat(config.interestRate ?? '0')
        if (rate <= 0) return 0
        const periods = effectiveDays / daysInPeriod
        return Math.round(baseAmount * (Math.pow(1 + rate, periods) - 1) * 100) / 100
      }
      case 'fixed_amount': {
        const fixedAmount = parseFloat(config.fixedAmount ?? '0')
        if (fixedAmount <= 0) return 0
        const periods = Math.floor(effectiveDays / daysInPeriod)
        return periods > 0 ? Math.round(fixedAmount * periods * 100) / 100 : 0
      }
      default:
        return 0
    }
  }

  private getDaysInPeriod(period: string | null): number {
    switch (period) {
      case 'daily': return 1
      case 'weekly': return 7
      case 'biweekly': return 14
      case 'monthly': return 30
      case 'quarterly': return 90
      case 'semi_annual': return 180
      case 'annual': return 360
      default: return 30
    }
  }
}
