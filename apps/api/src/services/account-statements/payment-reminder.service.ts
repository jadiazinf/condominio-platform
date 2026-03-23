import type { QuotasRepository } from '@database/repositories'
import { type TServiceResult, success } from '../base.service'
import { parseAmount, toDecimal } from '@packages/utils/money'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type TReminderType =
  | 'pre_due_5' // 5 days before due
  | 'due_today' // day of due
  | 'overdue_5' // 5 days after due
  | 'overdue_15' // 15 days after due
  | 'overdue_30' // 30 days after due

export interface IReminderCandidate {
  unitId: string
  userId: string
  quotaId: string
  reminderType: TReminderType
  dueDate: string
  balance: string
  periodDescription: string
  daysRelativeToDue: number // negative = before, positive = after
}

export interface IPaymentReminderInput {
  condominiumId: string
  asOfDate?: string // defaults to today
}

export interface IPaymentReminderOutput {
  candidates: IReminderCandidate[]
  totalCandidates: number
}

type TUnitOwnership = {
  unitId: string
  userId: string | null
}

type TUnitOwnershipsRepo = {
  listByCondominiumId: (condominiumId: string) => Promise<TUnitOwnership[]>
}

// ─────────────────────────────────────────────────────────────────────────────
// Service
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Identifies quotas that need payment reminders on a given date.
 *
 * Reminder tiers (escalated):
 * - pre_due_5: 5 days before dueDate
 * - due_today: on dueDate
 * - overdue_5: 5 days after dueDate
 * - overdue_15: 15 days after dueDate
 * - overdue_30: 30 days after dueDate
 *
 * This service only identifies candidates — actual notification sending
 * is handled by the caller (worker processor or controller).
 */
export class PaymentReminderService {
  constructor(
    private readonly quotasRepo: QuotasRepository,
    private readonly unitOwnershipsRepo: TUnitOwnershipsRepo
  ) {}

  async execute(input: IPaymentReminderInput): Promise<TServiceResult<IPaymentReminderOutput>> {
    const asOfDate = input.asOfDate ?? new Date().toISOString().slice(0, 10)
    const asOf = new Date(asOfDate)

    // 1. Get all pending/partial/overdue quotas for this condominium
    const allQuotas = await this.quotasRepo.getByPeriod(
      asOf.getFullYear(),
      undefined,
      input.condominiumId
    )

    // Include quotas from the previous year that might still be unpaid
    const prevYearQuotas = await this.quotasRepo.getByPeriod(
      asOf.getFullYear() - 1,
      undefined,
      input.condominiumId
    )

    const unpaidQuotas = [...allQuotas, ...prevYearQuotas].filter(
      q =>
        (q.status === 'pending' || q.status === 'partial' || q.status === 'overdue') &&
        parseAmount(q.balance) > 0
    )

    if (unpaidQuotas.length === 0) {
      return success({ candidates: [], totalCandidates: 0 })
    }

    // 2. Get unit owners to know who to notify
    const ownerships = await this.unitOwnershipsRepo.listByCondominiumId(input.condominiumId)
    const ownerByUnit = new Map<string, string>()
    for (const o of ownerships) {
      // First owner found per unit (primary), skip if no userId
      if (o.userId && !ownerByUnit.has(o.unitId)) {
        ownerByUnit.set(o.unitId, o.userId)
      }
    }

    // 3. Match quotas to reminder tiers
    const candidates: IReminderCandidate[] = []
    const msPerDay = 24 * 60 * 60 * 1000

    for (const q of unpaidQuotas) {
      const dueDate = new Date(q.dueDate)
      const daysFromDue = Math.round((asOf.getTime() - dueDate.getTime()) / msPerDay)

      const reminderType = this.matchReminderType(daysFromDue)
      if (!reminderType) continue

      const userId = ownerByUnit.get(q.unitId)
      if (!userId) continue

      candidates.push({
        unitId: q.unitId,
        userId,
        quotaId: q.id,
        reminderType,
        dueDate: q.dueDate,
        balance: toDecimal(parseAmount(q.balance)),
        periodDescription:
          q.periodDescription ?? `${q.periodYear}-${String(q.periodMonth).padStart(2, '0')}`,
        daysRelativeToDue: daysFromDue,
      })
    }

    return success({
      candidates,
      totalCandidates: candidates.length,
    })
  }

  /**
   * Matches the day offset to a reminder type.
   * Only returns a match on the exact day the reminder should fire.
   */
  private matchReminderType(daysFromDue: number): TReminderType | null {
    if (daysFromDue === -5) return 'pre_due_5'
    if (daysFromDue === 0) return 'due_today'
    if (daysFromDue === 5) return 'overdue_5'
    if (daysFromDue === 15) return 'overdue_15'
    if (daysFromDue === 30) return 'overdue_30'
    return null
  }
}
