import type { TPaymentConcept } from '@packages/domain'
import type { PaymentConceptsRepository } from '@database/repositories'
import { type TServiceResult, success } from '../base.service'

export interface IGetRecurringConceptsInput {
  includeInactive?: boolean
}

export class GetRecurringConceptsService {
  constructor(private readonly repository: PaymentConceptsRepository) {}

  async execute(
    input: IGetRecurringConceptsInput = {}
  ): Promise<TServiceResult<TPaymentConcept[]>> {
    const concepts = await this.repository.getRecurringConcepts(input.includeInactive ?? false)
    return success(concepts)
  }
}
