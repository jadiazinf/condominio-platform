import type { TMessage } from '@packages/domain'
import type { MessagesRepository } from '@database/repositories'
import { type TServiceResult, success } from '../base.service'

export interface IGetUnreadMessagesByUserInput {
  recipientUserId: string
}

export class GetUnreadMessagesByUserService {
  constructor(private readonly repository: MessagesRepository) {}

  async execute(input: IGetUnreadMessagesByUserInput): Promise<TServiceResult<TMessage[]>> {
    const messages = await this.repository.getUnreadByUserId(input.recipientUserId)
    return success(messages)
  }
}
