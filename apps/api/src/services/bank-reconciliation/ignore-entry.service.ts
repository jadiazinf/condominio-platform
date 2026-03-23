import type { TServiceResult } from '@packages/services'
import { success, failure } from '@packages/services'
import type { BankStatementEntriesRepository } from '@database/repositories'

export interface IIgnoreEntryInput {
  entryId: string
}

export class IgnoreEntryService {
  constructor(private readonly entriesRepo: BankStatementEntriesRepository) {}

  async execute(input: IIgnoreEntryInput): Promise<TServiceResult<{ entryId: string }>> {
    const entry = await this.entriesRepo.getById(input.entryId)
    if (!entry) return failure('Movimiento bancario no encontrado', 'NOT_FOUND')

    await this.entriesRepo.updateStatus(input.entryId, 'ignored', null)

    return success({ entryId: input.entryId })
  }
}
