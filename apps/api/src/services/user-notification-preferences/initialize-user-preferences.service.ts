import type { TUserNotificationPreference } from '@packages/domain'
import type { UserNotificationPreferencesRepository } from '@database/repositories'
import { type TServiceResult, success } from '../base.service'

const NOTIFICATION_CATEGORIES = [
  'payment',
  'quota',
  'announcement',
  'reminder',
  'alert',
  'system',
] as const
const NOTIFICATION_CHANNELS = ['in_app', 'email', 'push'] as const

export interface IInitializeUserPreferencesInput {
  userId: string
}

export type IInitializeUserPreferencesOutput = TUserNotificationPreference[]

/**
 * Initializes default notification preferences for a new user.
 * Creates preferences for all category/channel combinations with default values.
 */
export class InitializeUserPreferencesService {
  constructor(private readonly repository: UserNotificationPreferencesRepository) {}

  async execute(
    input: IInitializeUserPreferencesInput
  ): Promise<TServiceResult<IInitializeUserPreferencesOutput>> {
    const existingPreferences = await this.repository.getByUserId(input.userId)

    // If user already has preferences, don't reinitialize
    if (existingPreferences.length > 0) {
      return success(existingPreferences)
    }

    const createdPreferences: TUserNotificationPreference[] = []

    for (const category of NOTIFICATION_CATEGORIES) {
      for (const channel of NOTIFICATION_CHANNELS) {
        const preference = await this.repository.create({
          userId: input.userId,
          category,
          channel,
          isEnabled: true,
          quietHoursStart: null,
          quietHoursEnd: null,
          metadata: null,
        })
        createdPreferences.push(preference)
      }
    }

    return success(createdPreferences)
  }
}
