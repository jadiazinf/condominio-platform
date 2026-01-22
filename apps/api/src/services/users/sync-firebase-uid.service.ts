import type { TUser } from '@packages/domain'
import type { UsersRepository } from '@database/repositories'
import { type TServiceResult, success, failure } from '../base.service'

export interface ISyncFirebaseUidInput {
  email: string
  firebaseUid: string
}

/**
 * Service to sync the Firebase UID for an existing user.
 * This handles cases where a user exists in the database with a different Firebase UID
 * (e.g., when testing across different environments or Firebase projects).
 *
 * The service:
 * 1. Looks up the user by email
 * 2. If found and the Firebase UID is different, updates it
 * 3. Returns the updated user
 */
export class SyncFirebaseUidService {
  constructor(private readonly repository: UsersRepository) {}

  async execute(input: ISyncFirebaseUidInput): Promise<TServiceResult<TUser>> {
    // Find user by email
    const user = await this.repository.getByEmail(input.email)

    if (!user) {
      return failure('User not found', 'NOT_FOUND')
    }

    // If Firebase UID is already correct, return the user
    if (user.firebaseUid === input.firebaseUid) {
      return success(user)
    }

    // Update the Firebase UID
    const updatedUser = await this.repository.update(user.id, {
      firebaseUid: input.firebaseUid,
    })

    if (!updatedUser) {
      return failure('Failed to update user', 'INTERNAL_ERROR')
    }

    return success(updatedUser)
  }
}
