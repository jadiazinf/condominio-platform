import type { TExpenseCategory } from '@packages/domain'
import type { ExpenseCategoriesRepository } from '@database/repositories'
import { type TServiceResult, success } from '../base.service'

export interface IGetRootCategoriesInput {
  includeInactive?: boolean
}

export class GetRootCategoriesService {
  constructor(private readonly repository: ExpenseCategoriesRepository) {}

  async execute(input: IGetRootCategoriesInput = {}): Promise<TServiceResult<TExpenseCategory[]>> {
    const categories = await this.repository.getRootCategories(input.includeInactive)
    return success(categories)
  }
}
