import type { TServiceResult } from '@packages/services'
import { success, failure } from '@packages/services'
import type {
  BankStatementEntriesRepository,
  BankStatementMatchesRepository,
  PaymentsRepository,
} from '@database/repositories'
import type { TBankStatementMatch } from '@packages/domain'

export interface IManualMatchInput {
  entryId: string
  paymentId: string
  matchedBy: string
  notes?: string
}

export class ManualMatchService {
  constructor(
    private readonly entriesRepo: BankStatementEntriesRepository,
    private readonly matchesRepo: BankStatementMatchesRepository,
    private readonly paymentsRepo: PaymentsRepository
  ) {}

  async execute(input: IManualMatchInput): Promise<TServiceResult<TBankStatementMatch>> {
    const { entryId, paymentId, matchedBy, notes } = input

    // Validate entry exists and is unmatched
    const entry = await this.entriesRepo.getById(entryId)
    if (!entry) return failure('Movimiento bancario no encontrado', 'NOT_FOUND')
    if (entry.status === 'matched') {
      return failure('Este movimiento ya está conciliado', 'CONFLICT')
    }

    // Validate payment exists
    const payment = await this.paymentsRepo.getById(paymentId)
    if (!payment) return failure('Pago no encontrado', 'NOT_FOUND')

    // Check payment isn't already matched to another entry
    const existingMatches = await this.matchesRepo.getByPaymentId(paymentId)
    if (existingMatches.length > 0) {
      return failure('Este pago ya está vinculado a otro movimiento bancario', 'CONFLICT')
    }

    // Create match
    const match = await this.matchesRepo.create({
      entryId,
      paymentId,
      matchType: 'manual',
      confidence: '100.00',
      matchedBy,
      notes: notes ?? null,
    })

    // Update entry status
    await this.entriesRepo.updateStatus(entryId, 'matched')

    return success(match)
  }
}
