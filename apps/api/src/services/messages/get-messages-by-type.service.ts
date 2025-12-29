import type { TMessage, TMessageType } from '@packages/domain'
import type { MessagesRepository } from '@database/repositories'
import { type TServiceResult, success } from '../base.service'

export interface IGetMessagesByTypeInput {
  messageType: TMessageType
}

export class GetMessagesByTypeService {
  constructor(private readonly repository: MessagesRepository) {}

  async execute(input: IGetMessagesByTypeInput): Promise<TServiceResult<TMessage[]>> {
    const messages = await this.repository.getByType(input.messageType)
    return success(messages)
  }
}
