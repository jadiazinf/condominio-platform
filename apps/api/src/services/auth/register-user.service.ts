import type { TUser, TRegisterSchema } from '@packages/domain'
import type { UsersRepository } from '@database/repositories/users.repository'
import type { IService, TServiceResult } from '../base.service'
import { success, failure } from '../base.service'

export type TRegisterUserInput = {
  /** Firebase UID from the decoded token */
  firebaseUid: string
  /** Email from Firebase token */
  email: string
  /** Display name from Firebase token (may be null for email/password auth) */
  displayName: string | null
  /** Photo URL from Firebase token (may be null for email/password auth) */
  photoUrl: string | null
  /** Whether the email is verified in Firebase */
  emailVerified: boolean
  /** Additional user data from the registration form */
  userData: TRegisterSchema
}

/**
 * Service to register a new user from any Firebase authentication method.
 * Creates the user in the database using Firebase token data.
 */
export class RegisterUserService
  implements IService<TRegisterUserInput, TServiceResult<TUser>>
{
  constructor(private readonly usersRepository: UsersRepository) {}

  async execute(input: TRegisterUserInput): Promise<TServiceResult<TUser>> {
    const { firebaseUid, email, displayName, photoUrl, emailVerified, userData } = input

    // Check if user already exists
    const existingUser = await this.usersRepository.getByFirebaseUid(firebaseUid)
    if (existingUser) {
      return failure('User already registered', 'CONFLICT')
    }

    // Also check by email to prevent duplicate accounts
    const existingByEmail = await this.usersRepository.getByEmail(email)
    if (existingByEmail) {
      return failure('Email already in use', 'CONFLICT')
    }

    // Create the user
    const user = await this.usersRepository.create({
      firebaseUid,
      email,
      displayName,
      photoUrl,
      firstName: userData.firstName,
      lastName: userData.lastName,
      preferredLanguage: userData.preferredLanguage,
      isEmailVerified: emailVerified,
      isActive: true,
      // Set nullable fields to null
      phoneNumber: null,
      idDocumentType: null,
      idDocumentNumber: null,
      address: null,
      locationId: null,
      preferredCurrencyId: null,
      lastLogin: new Date(),
      metadata: null,
    })

    return success(user)
  }
}
