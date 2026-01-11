import type { TUserNotificationPreference } from '@packages/domain'
import type { UserNotificationPreferencesRepository } from '@database/repositories'
import { type TServiceResult, success } from '../base.service'

export interface IGetUserPreferencesInput {
  userId: string
}

export type IGetUserPreferencesOutput = TUserNotificationPreference[]

export class GetUserPreferencesService {
  constructor(private readonly repository: UserNotificationPreferencesRepository) {}

  async execute(
    input: IGetUserPreferencesInput
  ): Promise<TServiceResult<IGetUserPreferencesOutput>> {
    const preferences = await this.repository.getByUserId(input.userId)
    return success(preferences)
  }
}
