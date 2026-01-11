import type { UserFcmTokensRepository } from '@database/repositories'
import { type TServiceResult, success, failure } from '../base.service'

export interface IUnregisterTokenInput {
  token: string
  userId?: string // Optional: if provided, only unregister if it belongs to this user
}

export interface IUnregisterTokenOutput {
  deleted: boolean
}

export class UnregisterTokenService {
  constructor(private readonly fcmTokensRepository: UserFcmTokensRepository) {}

  async execute(input: IUnregisterTokenInput): Promise<TServiceResult<IUnregisterTokenOutput>> {
    const existing = await this.fcmTokensRepository.getByToken(input.token)

    if (!existing) {
      return success({ deleted: false })
    }

    // If userId is provided, verify ownership
    if (input.userId && existing.userId !== input.userId) {
      return failure('Token does not belong to this user', 'BAD_REQUEST')
    }

    const deleted = await this.fcmTokensRepository.deleteByToken(input.token)

    return success({ deleted })
  }
}
