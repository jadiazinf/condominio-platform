import type { TExpense } from '@packages/domain'
import type { ExpensesRepository } from '@database/repositories'
import { type TServiceResult, success } from '../base.service'

export interface IGetExpensesByDateRangeInput {
  startDate: string
  endDate: string
}

export class GetExpensesByDateRangeService {
  constructor(private readonly repository: ExpensesRepository) {}

  async execute(input: IGetExpensesByDateRangeInput): Promise<TServiceResult<TExpense[]>> {
    const expenses = await this.repository.getByDateRange(input.startDate, input.endDate)
    return success(expenses)
  }
}
