import type { TUser } from '@packages/domain'
import type { UsersRepository } from '@database/repositories'
import { type TServiceResult, success, failure } from '../base.service'

export interface IGetUserByFirebaseUidInput {
  firebaseUid: string
}

export class GetUserByFirebaseUidService {
  constructor(private readonly repository: UsersRepository) {}

  async execute(input: IGetUserByFirebaseUidInput): Promise<TServiceResult<TUser>> {
    const user = await this.repository.getByFirebaseUid(input.firebaseUid)

    if (!user) {
      return failure('User not found', 'NOT_FOUND')
    }

    return success(user)
  }
}
