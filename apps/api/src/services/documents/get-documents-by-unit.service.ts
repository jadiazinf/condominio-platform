import type { TDocument } from '@packages/domain'
import type { DocumentsRepository } from '@database/repositories'
import { type TServiceResult, success } from '../base.service'

export interface IGetDocumentsByUnitInput {
  unitId: string
}

export class GetDocumentsByUnitService {
  constructor(private readonly repository: DocumentsRepository) {}

  async execute(input: IGetDocumentsByUnitInput): Promise<TServiceResult<TDocument[]>> {
    const documents = await this.repository.getByUnitId(input.unitId)
    return success(documents)
  }
}
