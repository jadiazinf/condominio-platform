import type { TExpenseCategory } from '@packages/domain'
import type { ExpenseCategoriesRepository } from '@database/repositories'
import { type TServiceResult, success } from '../base.service'

export interface IGetCategoriesByParentInput {
  parentCategoryId: string
  includeInactive?: boolean
}

export class GetCategoriesByParentService {
  constructor(private readonly repository: ExpenseCategoriesRepository) {}

  async execute(input: IGetCategoriesByParentInput): Promise<TServiceResult<TExpenseCategory[]>> {
    const categories = await this.repository.getByParentId(
      input.parentCategoryId,
      input.includeInactive
    )
    return success(categories)
  }
}
