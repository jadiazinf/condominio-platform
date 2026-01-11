import type { TNotification } from '@packages/domain'
import type { NotificationsRepository } from '@database/repositories'
import { type TServiceResult, success } from '../base.service'

export interface IGetUserNotificationsInput {
  userId: string
  category?: TNotification['category']
  unreadOnly?: boolean
}

export type IGetUserNotificationsOutput = TNotification[]

export class GetUserNotificationsService {
  constructor(private readonly repository: NotificationsRepository) {}

  async execute(
    input: IGetUserNotificationsInput
  ): Promise<TServiceResult<IGetUserNotificationsOutput>> {
    let notifications: TNotification[]

    if (input.category) {
      notifications = await this.repository.getByUserIdAndCategory(input.userId, input.category)
    } else if (input.unreadOnly) {
      notifications = await this.repository.getUnreadByUserId(input.userId)
    } else {
      notifications = await this.repository.getByUserId(input.userId)
    }

    return success(notifications)
  }
}
