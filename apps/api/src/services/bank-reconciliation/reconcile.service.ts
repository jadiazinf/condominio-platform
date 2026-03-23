import type { TServiceResult } from '@packages/services'
import { success, failure } from '@packages/services'
import type {
  BankReconciliationsRepository,
  BankStatementEntriesRepository,
  BankStatementImportsRepository,
} from '@database/repositories'

export interface IReconcileInput {
  reconciliationId: string
  reconciledBy: string
}

export interface IReconcileResult {
  reconciliationId: string
  totalMatched: number
  totalUnmatched: number
  totalIgnored: number
}

export class ReconcileService {
  constructor(
    private readonly reconciliationsRepo: BankReconciliationsRepository,
    private readonly entriesRepo: BankStatementEntriesRepository,
    private readonly importsRepo: BankStatementImportsRepository
  ) {}

  async execute(input: IReconcileInput): Promise<TServiceResult<IReconcileResult>> {
    const { reconciliationId, reconciledBy } = input

    const reconciliation = await this.reconciliationsRepo.getById(reconciliationId)
    if (!reconciliation) {
      return failure('Conciliación no encontrada', 'NOT_FOUND')
    }
    if (reconciliation.status === 'completed') {
      return failure('Esta conciliación ya fue completada', 'CONFLICT')
    }
    if (reconciliation.status === 'cancelled') {
      return failure('Esta conciliación fue cancelada', 'CONFLICT')
    }

    // Get all imports in the reconciliation period
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

    // Count entries by status across all imports
    let totalMatched = 0
    let totalUnmatched = 0
    let totalIgnored = 0

    for (const imp of imports) {
      const entries = await this.entriesRepo.getByImportId(imp.id)
      for (const entry of entries) {
        if (entry.status === 'matched') totalMatched++
        else if (entry.status === 'unmatched') totalUnmatched++
        else if (entry.status === 'ignored') totalIgnored++
      }
    }

    // Fail if there are unmatched entries
    if (totalUnmatched > 0) {
      return failure(
        `Hay ${totalUnmatched} movimiento(s) sin conciliar. Concilia o ignora todos los movimientos antes de completar.`,
        'BAD_REQUEST'
      )
    }

    // Complete reconciliation
    await this.reconciliationsRepo.update(reconciliationId, {
      status: 'completed',
      totalMatched,
      totalUnmatched: 0,
      totalIgnored,
      reconciledBy,
      reconciledAt: new Date(),
    })

    return success({
      reconciliationId,
      totalMatched,
      totalUnmatched: 0,
      totalIgnored,
    })
  }
}
