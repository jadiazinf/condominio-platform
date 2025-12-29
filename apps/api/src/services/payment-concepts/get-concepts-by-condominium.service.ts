import type { TPaymentConcept } from '@packages/domain'
import type { PaymentConceptsRepository } from '@database/repositories'
import { type TServiceResult, success } from '../base.service'

export interface IGetConceptsByCondominiumInput {
  condominiumId: string
  includeInactive?: boolean
}

export class GetConceptsByCondominiumService {
  constructor(private readonly repository: PaymentConceptsRepository) {}

  async execute(input: IGetConceptsByCondominiumInput): Promise<TServiceResult<TPaymentConcept[]>> {
    const concepts = await this.repository.getByCondominiumId(
      input.condominiumId,
      input.includeInactive ?? false
    )
    return success(concepts)
  }
}
