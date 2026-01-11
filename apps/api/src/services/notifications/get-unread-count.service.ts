import type { NotificationsRepository } from '@database/repositories'
import { type TServiceResult, success } from '../base.service'

export interface IGetUnreadCountInput {
  userId: string
}

export interface IGetUnreadCountOutput {
  count: number
}

export class GetUnreadCountService {
  constructor(private readonly repository: NotificationsRepository) {}

  async execute(input: IGetUnreadCountInput): Promise<TServiceResult<IGetUnreadCountOutput>> {
    const count = await this.repository.getUnreadCount(input.userId)
    return success({ count })
  }
}
