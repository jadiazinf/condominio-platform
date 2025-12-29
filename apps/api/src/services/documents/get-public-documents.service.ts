import type { TDocument } from '@packages/domain'
import type { DocumentsRepository } from '@database/repositories'
import { type TServiceResult, success } from '../base.service'

export class GetPublicDocumentsService {
  constructor(private readonly repository: DocumentsRepository) {}

  async execute(): Promise<TServiceResult<TDocument[]>> {
    const documents = await this.repository.getPublicDocuments()
    return success(documents)
  }
}
