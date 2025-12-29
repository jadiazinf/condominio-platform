import type { TExpense } from '@packages/domain'
import type { ExpensesRepository } from '@database/repositories'
import { type TServiceResult, success } from '../base.service'

export interface IGetExpensesByBuildingInput {
  buildingId: string
}

export class GetExpensesByBuildingService {
  constructor(private readonly repository: ExpensesRepository) {}

  async execute(input: IGetExpensesByBuildingInput): Promise<TServiceResult<TExpense[]>> {
    const expenses = await this.repository.getByBuildingId(input.buildingId)
    return success(expenses)
  }
}
