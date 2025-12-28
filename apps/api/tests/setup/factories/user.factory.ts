import { faker } from '@faker-js/faker'
import type { TUserCreate } from '@packages/domain'

/**
 * Factory for creating user test data.
 */
export class UserFactory {
  /**
   * Creates fake data for a user.
   */
  static create(overrides: Partial<TUserCreate> = {}): TUserCreate {
    return {
      firebaseUid: faker.string.alphanumeric(28),
      email: faker.internet.email(),
      displayName: faker.person.fullName(),
      phoneNumber: faker.phone.number(),
      photoUrl: faker.image.avatar(),
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      idDocumentType: 'Pasaporte',
      idDocumentNumber: faker.string.alphanumeric(10),
      address: faker.location.streetAddress(),
      locationId: null,
      preferredLanguage: 'es',
      preferredCurrencyId: null,
      isActive: true,
      isEmailVerified: true,
      lastLogin: null,
      metadata: null,
      ...overrides,
    }
  }

  /**
   * Creates fake data for a verified user.
   */
  static verified(overrides: Partial<TUserCreate> = {}): TUserCreate {
    return this.create({
      isEmailVerified: true,
      ...overrides,
    })
  }

  /**
   * Creates fake data for an unverified user.
   */
  static unverified(overrides: Partial<TUserCreate> = {}): TUserCreate {
    return this.create({
      isEmailVerified: false,
      ...overrides,
    })
  }

  /**
   * Creates fake data for an inactive user.
   */
  static inactive(overrides: Partial<TUserCreate> = {}): TUserCreate {
    return this.create({
      isActive: false,
      ...overrides,
    })
  }

  /**
   * Creates fake data for a user with specific location.
   */
  static withLocation(locationId: string, overrides: Partial<TUserCreate> = {}): TUserCreate {
    return this.create({
      locationId,
      ...overrides,
    })
  }

  /**
   * Creates fake data for a user with preferred currency.
   */
  static withCurrency(currencyId: string, overrides: Partial<TUserCreate> = {}): TUserCreate {
    return this.create({
      preferredCurrencyId: currencyId,
      ...overrides,
    })
  }
}
