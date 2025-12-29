import type { TMessage } from '@packages/domain'
import type { MessagesRepository } from '@database/repositories'
import { type TServiceResult, success } from '../base.service'

export interface IGetMessagesBySenderInput {
  senderId: string
}

export class GetMessagesBySenderService {
  constructor(private readonly repository: MessagesRepository) {}

  async execute(input: IGetMessagesBySenderInput): Promise<TServiceResult<TMessage[]>> {
    const messages = await this.repository.getBySenderId(input.senderId)
    return success(messages)
  }
}
