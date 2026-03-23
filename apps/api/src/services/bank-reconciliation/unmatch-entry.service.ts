import type { TServiceResult } from '@packages/services'
import { success, failure } from '@packages/services'
import type {
  BankStatementEntriesRepository,
  BankStatementMatchesRepository,
} from '@database/repositories'

export interface IUnmatchEntryInput {
  entryId: string
}

export class UnmatchEntryService {
  constructor(
    private readonly entriesRepo: BankStatementEntriesRepository,
    private readonly matchesRepo: BankStatementMatchesRepository
  ) {}

  async execute(input: IUnmatchEntryInput): Promise<TServiceResult<{ entryId: string }>> {
    const entry = await this.entriesRepo.getById(input.entryId)
    if (!entry) return failure('Movimiento bancario no encontrado', 'NOT_FOUND')
    if (entry.status !== 'matched') {
      return failure('Este movimiento no está conciliado', 'BAD_REQUEST')
    }

    await this.matchesRepo.deleteByEntryId(input.entryId)
    await this.entriesRepo.updateStatus(input.entryId, 'unmatched', null)

    return success({ entryId: input.entryId })
  }
}
