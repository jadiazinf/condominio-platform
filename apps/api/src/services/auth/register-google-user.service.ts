import type { TUser, TGoogleRegisterSchema } from '@packages/domain'
import type { UsersRepository } from '@database/repositories/users.repository'
import type { IService, TServiceResult } from '../base.service'
import { success, failure } from '../base.service'

export type TRegisterGoogleUserInput = {
  /** Firebase UID from the decoded token */
  firebaseUid: string
  /** Email from Firebase token */
  email: string
  /** Display name from Firebase token (Google profile name) */
  displayName: string | null
  /** Photo URL from Firebase token (Google profile picture) */
  photoUrl: string | null
  /** Whether the email is verified in Firebase */
  emailVerified: boolean
  /** Additional user data from the registration form */
  userData: TGoogleRegisterSchema
}

/**
 * Service to register a new user from Google Sign-In.
 * Creates the user in the database using Firebase token data.
 */
export class RegisterGoogleUserService
  implements IService<TRegisterGoogleUserInput, TServiceResult<TUser>>
{
  constructor(private readonly usersRepository: UsersRepository) {}

  async execute(input: TRegisterGoogleUserInput): Promise<TServiceResult<TUser>> {
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
      firstName: userData.firstName ?? null,
      lastName: userData.lastName ?? null,
      preferredLanguage: userData.preferredLanguage,
      isEmailVerified: emailVerified,
      isActive: true,
      // Set nullable fields to null
      phoneCountryCode: null,
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
