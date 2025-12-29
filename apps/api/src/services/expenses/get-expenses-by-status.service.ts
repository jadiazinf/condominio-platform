import type { TExpense, TExpenseStatus } from '@packages/domain'
import type { ExpensesRepository } from '@database/repositories'
import { type TServiceResult, success } from '../base.service'

export interface IGetExpensesByStatusInput {
  status: TExpenseStatus
}

export class GetExpensesByStatusService {
  constructor(private readonly repository: ExpensesRepository) {}

  async execute(input: IGetExpensesByStatusInput): Promise<TServiceResult<TExpense[]>> {
    const expenses = await this.repository.getByStatus(input.status)
    return success(expenses)
  }
}
