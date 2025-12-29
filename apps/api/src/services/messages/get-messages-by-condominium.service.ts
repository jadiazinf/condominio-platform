import type { TMessage } from '@packages/domain'
import type { MessagesRepository } from '@database/repositories'
import { type TServiceResult, success } from '../base.service'

export interface IGetMessagesByCondominiumInput {
  condominiumId: string
}

export class GetMessagesByCondominiumService {
  constructor(private readonly repository: MessagesRepository) {}

  async execute(input: IGetMessagesByCondominiumInput): Promise<TServiceResult<TMessage[]>> {
    const messages = await this.repository.getByCondominiumId(input.condominiumId)
    return success(messages)
  }
}
