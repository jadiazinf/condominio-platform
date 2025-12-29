import type { TExpense } from '@packages/domain'
import type { ExpensesRepository } from '@database/repositories'
import { type TServiceResult, success } from '../base.service'

export class GetPendingApprovalExpensesService {
  constructor(private readonly repository: ExpensesRepository) {}

  async execute(): Promise<TServiceResult<TExpense[]>> {
    const expenses = await this.repository.getPendingApproval()
    return success(expenses)
  }
}
