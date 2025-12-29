import type { TMessage } from '@packages/domain'
import type { MessagesRepository } from '@database/repositories'
import { type TServiceResult, success } from '../base.service'

export interface IGetMessagesByRecipientInput {
  recipientUserId: string
}

export class GetMessagesByRecipientService {
  constructor(private readonly repository: MessagesRepository) {}

  async execute(input: IGetMessagesByRecipientInput): Promise<TServiceResult<TMessage[]>> {
    const messages = await this.repository.getByRecipientUserId(input.recipientUserId)
    return success(messages)
  }
}
