import type { TNotification } from '@packages/domain'
import type { NotificationsRepository } from '@database/repositories'
import { type TServiceResult, success, failure } from '../base.service'

export interface IMarkAsReadInput {
  notificationId: string
}

export type IMarkAsReadOutput = TNotification

export class MarkAsReadService {
  constructor(private readonly repository: NotificationsRepository) {}

  async execute(input: IMarkAsReadInput): Promise<TServiceResult<IMarkAsReadOutput>> {
    const notification = await this.repository.markAsRead(input.notificationId)

    if (!notification) {
      return failure('Notification not found', 'NOT_FOUND')
    }

    return success(notification)
  }
}
