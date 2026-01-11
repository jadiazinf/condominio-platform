import type { TUserFcmToken } from '@packages/domain'
import type { UserFcmTokensRepository } from '@database/repositories'
import { type TServiceResult, success, failure } from '../base.service'

export interface IRegisterTokenInput {
  userId: string
  token: string
  platform: 'web' | 'ios' | 'android'
  deviceName?: string
}

export interface IRegisterTokenOutput {
  fcmToken: TUserFcmToken
  isNew: boolean
}

export class RegisterTokenService {
  constructor(private readonly fcmTokensRepository: UserFcmTokensRepository) {}

  async execute(input: IRegisterTokenInput): Promise<TServiceResult<IRegisterTokenOutput>> {
    // Check if token already exists for this user
    const existing = await this.fcmTokensRepository.getByUserAndToken(input.userId, input.token)

    if (existing) {
      // Update lastUsedAt and ensure it's active
      const updated = await this.fcmTokensRepository.update(existing.id, {
        lastUsedAt: new Date(),
        isActive: true,
        deviceName: input.deviceName ?? existing.deviceName,
      })

      return success({
        fcmToken: updated!,
        isNew: false,
      })
    }

    // Create new token
    const fcmToken = await this.fcmTokensRepository.create({
      userId: input.userId,
      token: input.token,
      platform: input.platform,
      deviceName: input.deviceName ?? null,
      isActive: true,
      metadata: null,
    })

    return success({
      fcmToken,
      isNew: true,
    })
  }
}
