import type { TUser } from '@packages/domain'
import type { UsersRepository } from '@database/repositories'
import { type TServiceResult, success, failure } from '../base.service'

export interface IGetUserByEmailInput {
  email: string
}

export class GetUserByEmailService {
  constructor(private readonly repository: UsersRepository) {}

  async execute(input: IGetUserByEmailInput): Promise<TServiceResult<TUser>> {
    const user = await this.repository.getByEmail(input.email)

    if (!user) {
      return failure('User not found', 'NOT_FOUND')
    }

    return success(user)
  }
}
