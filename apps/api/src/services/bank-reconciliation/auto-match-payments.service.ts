import type { TServiceResult } from '@packages/services'
import { success } from '@packages/services'
import type {
  BankStatementEntriesRepository,
  BankStatementMatchesRepository,
  PaymentsRepository,
  GatewayTransactionsRepository,
} from '@database/repositories'
import type { TBankStatementEntry } from '@packages/domain'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface IAutoMatchInput {
  importId: string
}

export interface IMatchResult {
  entryId: string
  paymentId: string
  matchType: 'auto_reference' | 'auto_amount_date'
  confidence: string
}

export interface IAutoMatchResult {
  matched: number
  unmatched: number
  matches: IMatchResult[]
}

// ─── Service ─────────────────────────────────────────────────────────────────

export class AutoMatchPaymentsService {
  constructor(
    private readonly entriesRepo: BankStatementEntriesRepository,
    private readonly matchesRepo: BankStatementMatchesRepository,
    private readonly paymentsRepo: PaymentsRepository,
    private readonly gatewayTransactionsRepo: GatewayTransactionsRepository
  ) {}

  async execute(input: IAutoMatchInput): Promise<TServiceResult<IAutoMatchResult>> {
    const entries = await this.entriesRepo.getUnmatchedByImportId(input.importId)

    // Only match credit entries (payments received, not bank charges)
    const creditEntries = entries.filter(e => e.entryType === 'credit')

    const matches: IMatchResult[] = []
    const matchedPaymentIds = new Set<string>()
    let unmatched = 0

    for (const entry of creditEntries) {
      const match = await this.tryMatchEntry(entry, matchedPaymentIds)

      if (match) {
        matchedPaymentIds.add(match.paymentId)

        await this.matchesRepo.create({
          entryId: entry.id,
          paymentId: match.paymentId,
          matchType: match.matchType,
          confidence: match.confidence,
          matchedBy: null,
          notes: null,
        })

        await this.entriesRepo.updateStatus(entry.id, 'matched')

        matches.push(match)
      } else {
        unmatched++
      }
    }

    // Count debit entries as unmatched too (they're not matchable)
    const debitCount = entries.length - creditEntries.length
    unmatched += debitCount

    return success({
      matched: matches.length,
      unmatched,
      matches,
    })
  }

  private async tryMatchEntry(
    entry: TBankStatementEntry,
    alreadyMatchedPaymentIds: Set<string>
  ): Promise<IMatchResult | null> {
    // Strategy 1: Match by reference
    if (entry.reference) {
      const refMatch = await this.matchByReference(entry, alreadyMatchedPaymentIds)
      if (refMatch) return refMatch
    }

    // Strategy 2: Match by amount + date
    const amountDateMatch = await this.matchByAmountAndDate(entry, alreadyMatchedPaymentIds)
    if (amountDateMatch) return amountDateMatch

    return null
  }

  private async matchByReference(
    entry: TBankStatementEntry,
    alreadyMatchedPaymentIds: Set<string>
  ): Promise<IMatchResult | null> {
    const ref = entry.reference?.trim()
    if (!ref) return null

    // Try payment.receiptNumber
    const payments = await this.paymentsRepo.getByReceiptNumber(ref)
    const payment = payments.find(p => !alreadyMatchedPaymentIds.has(p.id))
    if (payment) {
      return {
        entryId: entry.id,
        paymentId: payment.id,
        matchType: 'auto_reference',
        confidence: '98.00',
      }
    }

    // Try gateway_transactions.externalReference
    const gatewayTx = await this.gatewayTransactionsRepo.getByExternalReference(ref)
    if (gatewayTx && gatewayTx.paymentId && !alreadyMatchedPaymentIds.has(gatewayTx.paymentId)) {
      return {
        entryId: entry.id,
        paymentId: gatewayTx.paymentId,
        matchType: 'auto_reference',
        confidence: '95.00',
      }
    }

    return null
  }

  private async matchByAmountAndDate(
    entry: TBankStatementEntry,
    alreadyMatchedPaymentIds: Set<string>
  ): Promise<IMatchResult | null> {
    // Search payments within ±3 days of entry date
    const entryDate = new Date(entry.transactionDate)
    const fromDate = new Date(entryDate)
    fromDate.setDate(fromDate.getDate() - 3)
    const toDate = new Date(entryDate)
    toDate.setDate(toDate.getDate() + 3)

    const from = fromDate.toISOString().slice(0, 10)
    const to = toDate.toISOString().slice(0, 10)

    const payments = await this.paymentsRepo.getByDateRange(from, to)

    // Find payment with matching amount that hasn't been matched yet
    const entryAmount = parseFloat(entry.amount)
    for (const payment of payments) {
      if (alreadyMatchedPaymentIds.has(payment.id)) continue

      const paymentAmount = parseFloat(payment.amount)
      if (Math.abs(entryAmount - paymentAmount) < 0.01) {
        // Calculate confidence based on date proximity
        const dateDiff = Math.abs(entryDate.getTime() - new Date(payment.paymentDate).getTime())
        const daysDiff = dateDiff / (1000 * 60 * 60 * 24)
        const confidence = daysDiff === 0 ? 85 : daysDiff <= 1 ? 80 : 75

        return {
          entryId: entry.id,
          paymentId: payment.id,
          matchType: 'auto_amount_date',
          confidence: confidence.toFixed(2),
        }
      }
    }

    return null
  }
}
