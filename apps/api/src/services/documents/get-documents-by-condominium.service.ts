import type { TDocument } from '@packages/domain'
import type { DocumentsRepository } from '@database/repositories'
import { type TServiceResult, success } from '../base.service'

export interface IGetDocumentsByCondominiumInput {
  condominiumId: string
}

export class GetDocumentsByCondominiumService {
  constructor(private readonly repository: DocumentsRepository) {}

  async execute(input: IGetDocumentsByCondominiumInput): Promise<TServiceResult<TDocument[]>> {
    const documents = await this.repository.getByCondominiumId(input.condominiumId)
    return success(documents)
  }
}
