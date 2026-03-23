import type { TServiceResult } from '@packages/services'
import { success, failure } from '@packages/services'
import type {
  BankReconciliationsRepository,
  BankStatementEntriesRepository,
  BankStatementMatchesRepository,
  BankStatementImportsRepository,
} from '@database/repositories'
import type {
  TBankStatementEntry,
  TBankStatementMatch,
  TBankReconciliation,
} from '@packages/domain'

export interface IGetReconciliationSummaryInput {
  reconciliationId: string
}

export interface IReconciliationSummary {
  reconciliation: TBankReconciliation
  totalMatched: number
  totalUnmatched: number
  totalIgnored: number
  totalCredits: string
  totalDebits: string
  unmatchedEntries: TBankStatementEntry[]
  matches: TBankStatementMatch[]
}

export class GetReconciliationSummaryService {
  constructor(
    private readonly reconciliationsRepo: BankReconciliationsRepository,
    private readonly entriesRepo: BankStatementEntriesRepository,
    private readonly matchesRepo: BankStatementMatchesRepository,
    private readonly importsRepo: BankStatementImportsRepository
  ) {}

  async execute(
    input: IGetReconciliationSummaryInput
  ): Promise<TServiceResult<IReconciliationSummary>> {
    const reconciliation = await this.reconciliationsRepo.getById(input.reconciliationId)
    if (!reconciliation) {
      return failure('Conciliación no encontrada', 'NOT_FOUND')
    }

    const periodFrom =
      reconciliation.periodFrom instanceof Date
        ? reconciliation.periodFrom.toISOString().slice(0, 10)
        : String(reconciliation.periodFrom)
    const periodTo =
      reconciliation.periodTo instanceof Date
        ? reconciliation.periodTo.toISOString().slice(0, 10)
        : String(reconciliation.periodTo)

    const imports = await this.importsRepo.getByBankAccountAndPeriod(
      reconciliation.bankAccountId,
      periodFrom,
      periodTo
    )

    // Collect all entries
    const allEntries: TBankStatementEntry[] = []
    for (const imp of imports) {
      const entries = await this.entriesRepo.getByImportId(imp.id)
      allEntries.push(...entries)
    }

    // Count by status and calculate totals
    let totalMatched = 0
    let totalUnmatched = 0
    let totalIgnored = 0
    let totalCredits = 0
    let totalDebits = 0
    const unmatchedEntries: TBankStatementEntry[] = []

    for (const entry of allEntries) {
      const amount = parseFloat(entry.amount)
      if (entry.entryType === 'credit') totalCredits += amount
      else totalDebits += amount

      if (entry.status === 'matched') totalMatched++
      else if (entry.status === 'unmatched') {
        totalUnmatched++
        unmatchedEntries.push(entry)
      } else if (entry.status === 'ignored') totalIgnored++
    }

    // Get matches for matched entries
    const matchedEntryIds = allEntries.filter(e => e.status === 'matched').map(e => e.id)
    const matches = await this.matchesRepo.getByEntryIds(matchedEntryIds)

    return success({
      reconciliation,
      totalMatched,
      totalUnmatched,
      totalIgnored,
      totalCredits: totalCredits.toFixed(2),
      totalDebits: totalDebits.toFixed(2),
      unmatchedEntries,
      matches,
    })
  }
}
