import type { TExpense } from '@packages/domain'
import type { ExpensesRepository } from '@database/repositories'
import { type TServiceResult, success } from '../base.service'

export interface IGetExpensesByCondominiumInput {
  condominiumId: string
}

export class GetExpensesByCondominiumService {
  constructor(private readonly repository: ExpensesRepository) {}

  async execute(input: IGetExpensesByCondominiumInput): Promise<TServiceResult<TExpense[]>> {
    const expenses = await this.repository.getByCondominiumId(input.condominiumId)
    return success(expenses)
  }
}
