import type { TUserFcmToken } from '@packages/domain'
import type { UserFcmTokensRepository } from '@database/repositories'
import { type TServiceResult, success } from '../base.service'

export interface IGetUserTokensInput {
  userId: string
  activeOnly?: boolean
}

export interface IGetUserTokensOutput {
  tokens: TUserFcmToken[]
}

export class GetUserTokensService {
  constructor(private readonly fcmTokensRepository: UserFcmTokensRepository) {}

  async execute(input: IGetUserTokensInput): Promise<TServiceResult<IGetUserTokensOutput>> {
    const tokens =
      input.activeOnly !== false
        ? await this.fcmTokensRepository.getActiveByUserId(input.userId)
        : await this.fcmTokensRepository.getByUserId(input.userId)

    return success({ tokens })
  }
}
