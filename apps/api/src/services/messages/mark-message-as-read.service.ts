import type { TMessage } from '@packages/domain'
import type { MessagesRepository } from '@database/repositories'
import { type TServiceResult, success, failure } from '../base.service'

export interface IMarkMessageAsReadInput {
  messageId: string
}

export type IMarkMessageAsReadOutput = TMessage

export class MarkMessageAsReadService {
  constructor(private readonly repository: MessagesRepository) {}

  async execute(input: IMarkMessageAsReadInput): Promise<TServiceResult<IMarkMessageAsReadOutput>> {
    const message = await this.repository.markAsRead(input.messageId)

    if (!message) {
      return failure('Message not found', 'NOT_FOUND')
    }

    return success(message)
  }
}
