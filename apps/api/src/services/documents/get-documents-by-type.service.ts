import type { TDocument, TDocumentType } from '@packages/domain'
import type { DocumentsRepository } from '@database/repositories'
import { type TServiceResult, success } from '../base.service'

export interface IGetDocumentsByTypeInput {
  documentType: TDocumentType
}

export class GetDocumentsByTypeService {
  constructor(private readonly repository: DocumentsRepository) {}

  async execute(input: IGetDocumentsByTypeInput): Promise<TServiceResult<TDocument[]>> {
    const documents = await this.repository.getByType(input.documentType)
    return success(documents)
  }
}
