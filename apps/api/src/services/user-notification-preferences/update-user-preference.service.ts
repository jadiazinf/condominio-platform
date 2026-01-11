import type { TUserNotificationPreference } from '@packages/domain'
import type { UserNotificationPreferencesRepository } from '@database/repositories'
import { type TServiceResult, success } from '../base.service'

export interface IUpdateUserPreferenceInput {
  userId: string
  category: TUserNotificationPreference['category']
  channel: TUserNotificationPreference['channel']
  isEnabled?: boolean
  quietHoursStart?: string | null
  quietHoursEnd?: string | null
}

export type IUpdateUserPreferenceOutput = TUserNotificationPreference

export class UpdateUserPreferenceService {
  constructor(private readonly repository: UserNotificationPreferencesRepository) {}

  async execute(
    input: IUpdateUserPreferenceInput
  ): Promise<TServiceResult<IUpdateUserPreferenceOutput>> {
    const preference = await this.repository.upsert(input.userId, input.category, input.channel, {
      isEnabled: input.isEnabled,
      quietHoursStart: input.quietHoursStart,
      quietHoursEnd: input.quietHoursEnd,
    })

    return success(preference)
  }
}
