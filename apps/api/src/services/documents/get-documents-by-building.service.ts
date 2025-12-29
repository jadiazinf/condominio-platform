import type { TDocument } from '@packages/domain'
import type { DocumentsRepository } from '@database/repositories'
import { type TServiceResult, success } from '../base.service'

export interface IGetDocumentsByBuildingInput {
  buildingId: string
}

export class GetDocumentsByBuildingService {
  constructor(private readonly repository: DocumentsRepository) {}

  async execute(input: IGetDocumentsByBuildingInput): Promise<TServiceResult<TDocument[]>> {
    const documents = await this.repository.getByBuildingId(input.buildingId)
    return success(documents)
  }
}
