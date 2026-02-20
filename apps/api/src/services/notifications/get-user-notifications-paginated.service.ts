import type { TNotification, TPaginatedResponse } from '@packages/domain'
import type { NotificationsRepository } from '@database/repositories'
import { type TServiceResult, success } from '../base.service'

export interface IGetUserNotificationsPaginatedInput {
  userId: string
  page?: number
  limit?: number
  category?: TNotification['category']
  isRead?: boolean
}

export class GetUserNotificationsPaginatedService {
  constructor(private readonly repository: NotificationsRepository) {}

  async execute(
    input: IGetUserNotificationsPaginatedInput
  ): Promise<TServiceResult<TPaginatedResponse<TNotification>>> {
    const result = await this.repository.listPaginatedByUserId(input.userId, {
      page: input.page,
      limit: input.limit,
      category: input.category,
      isRead: input.isRead,
    })

    return success(result)
  }
}
