import type { TPaymentConcept } from '@packages/domain'
import type { PaymentConceptsRepository } from '@database/repositories'
import { type TServiceResult, success } from '../base.service'

export interface IGetConceptsByBuildingInput {
  buildingId: string
  includeInactive?: boolean
}

export class GetConceptsByBuildingService {
  constructor(private readonly repository: PaymentConceptsRepository) {}

  async execute(input: IGetConceptsByBuildingInput): Promise<TServiceResult<TPaymentConcept[]>> {
    const concepts = await this.repository.getByBuildingId(
      input.buildingId,
      input.includeInactive ?? false
    )
    return success(concepts)
  }
}
