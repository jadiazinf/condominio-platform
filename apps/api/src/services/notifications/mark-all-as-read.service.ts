import type { NotificationsRepository } from '@database/repositories'
import { type TServiceResult, success } from '../base.service'

export interface IMarkAllAsReadInput {
  userId: string
}

export interface IMarkAllAsReadOutput {
  count: number
}

export class MarkAllAsReadService {
  constructor(private readonly repository: NotificationsRepository) {}

  async execute(input: IMarkAllAsReadInput): Promise<TServiceResult<IMarkAllAsReadOutput>> {
    const count = await this.repository.markAllAsRead(input.userId)
    return success({ count })
  }
}
