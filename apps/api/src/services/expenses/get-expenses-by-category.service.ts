import type { TExpense } from '@packages/domain'
import type { ExpensesRepository } from '@database/repositories'
import { type TServiceResult, success } from '../base.service'

export interface IGetExpensesByCategoryInput {
  categoryId: string
}

export class GetExpensesByCategoryService {
  constructor(private readonly repository: ExpensesRepository) {}

  async execute(input: IGetExpensesByCategoryInput): Promise<TServiceResult<TExpense[]>> {
    const expenses = await this.repository.getByCategoryId(input.categoryId)
    return success(expenses)
  }
}
