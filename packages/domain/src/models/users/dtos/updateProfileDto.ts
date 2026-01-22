import { z } from 'zod'

import { DomainLocaleDictionary } from '../../../i18n/dictionary'
import { EIdDocumentTypes } from '../schema'

const d = DomainLocaleDictionary.validation.models.users

/**
 * Schema for updating user profile.
 * Only includes fields that users can modify themselves.
 * Sensitive fields like email, firebaseUid, isActive are excluded.
 */
export const userUpdateProfileSchema = z.object({
  // Personal info
  firstName: z.string().max(100, { error: d.firstName.max }).nullable().optional(),
  lastName: z.string().max(100, { error: d.lastName.max }).nullable().optional(),
  displayName: z.string().max(255, { error: d.displayName.max }).nullable().optional(),
  phoneCountryCode: z.string().max(10, { error: d.phoneCountryCode.max }).nullable().optional(),
  phoneNumber: z.string().max(50, { error: d.phoneNumber.max }).nullable().optional(),
  photoUrl: z.string().url({ error: d.photoUrl.invalid }).nullable().optional(),
  // Identity document
  idDocumentType: z.enum(EIdDocumentTypes, { error: d.idDocumentType.invalid }).nullable().optional(),
  idDocumentNumber: z.string().max(50, { error: d.idDocumentNumber.max }).nullable().optional(),
  // Address
  address: z.string().max(500, { error: d.address.max }).nullable().optional(),
  locationId: z.uuid({ error: d.locationId.invalid }).nullable().optional(),
  // Preferences
  preferredLanguage: z.enum(['es', 'en']).optional(),
  preferredCurrencyId: z.uuid({ error: d.preferredCurrencyId.invalid }).nullable().optional(),
})

export type TUserUpdateProfile = z.infer<typeof userUpdateProfileSchema>
