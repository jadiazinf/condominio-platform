import type { TDocument } from '@packages/domain'
import type { DocumentsRepository } from '@database/repositories'
import { type TServiceResult, success } from '../base.service'

export interface IGetDocumentsByUserInput {
  userId: string
}

export class GetDocumentsByUserService {
  constructor(private readonly repository: DocumentsRepository) {}

  async execute(input: IGetDocumentsByUserInput): Promise<TServiceResult<TDocument[]>> {
    const documents = await this.repository.getByUserId(input.userId)
    return success(documents)
  }
}
