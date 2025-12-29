import type { TDocument } from '@packages/domain'
import type { DocumentsRepository } from '@database/repositories'
import { type TServiceResult, success } from '../base.service'

export interface IGetDocumentsByPaymentInput {
  paymentId: string
}

export class GetDocumentsByPaymentService {
  constructor(private readonly repository: DocumentsRepository) {}

  async execute(input: IGetDocumentsByPaymentInput): Promise<TServiceResult<TDocument[]>> {
    const documents = await this.repository.getByPaymentId(input.paymentId)
    return success(documents)
  }
}
