import type { TPaymentConcept } from '@packages/domain'
import type { PaymentConceptsRepository } from '@database/repositories'
import { type TServiceResult, success } from '../base.service'

export interface IGetConceptsByTypeInput {
  conceptType: TPaymentConcept['conceptType']
  includeInactive?: boolean
}

export class GetConceptsByTypeService {
  constructor(private readonly repository: PaymentConceptsRepository) {}

  async execute(input: IGetConceptsByTypeInput): Promise<TServiceResult<TPaymentConcept[]>> {
    const concepts = await this.repository.getByConceptType(
      input.conceptType,
      input.includeInactive ?? false
    )
    return success(concepts)
  }
}
