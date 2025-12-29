import type { TUser } from '@packages/domain'
import type { UsersRepository } from '@database/repositories'
import { type TServiceResult, success, failure } from '../base.service'

export interface IUpdateLastLoginInput {
  userId: string
}

export class UpdateLastLoginService {
  constructor(private readonly repository: UsersRepository) {}

  async execute(input: IUpdateLastLoginInput): Promise<TServiceResult<TUser>> {
    const user = await this.repository.updateLastLogin(input.userId)

    if (!user) {
      return failure('User not found', 'NOT_FOUND')
    }

    return success(user)
  }
}
