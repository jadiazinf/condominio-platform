import { z } from 'zod'
import { baseModelSchema, timestampField } from '../../shared/base-model.schema'
import { locationSchema } from '../locations/schema'
import { currencySchema } from '../currencies/schema'
import { DomainLocaleDictionary } from '../../i18n/dictionary'

const d = DomainLocaleDictionary.validation.models.users

export const EIdDocumentTypes = ['J', 'G', 'V', 'E', 'P'] as const

export const EPreferredLanguages = ['es', 'en'] as const

export const userSchema = baseModelSchema.extend({
  firebaseUid: z.string({ error: d.firebaseUid.required }).max(128, { error: d.firebaseUid.max }),
  email: z.email({ error: d.email.invalid }).max(255, { error: d.email.max }),
  displayName: z.string().max(255, { error: d.displayName.max }).nullable(),
  phoneCountryCode: z.string().max(10, { error: d.phoneCountryCode.max }).nullable(),
  phoneNumber: z.string().max(50, { error: d.phoneNumber.max }).nullable(),
  photoUrl: z.string().url({ error: d.photoUrl.invalid }).nullable(),
  firstName: z.string().max(100, { error: d.firstName.max }).nullable(),
  lastName: z.string().max(100, { error: d.lastName.max }).nullable(),
  idDocumentType: z.enum(EIdDocumentTypes, { error: d.idDocumentType.invalid }).nullable(),
  idDocumentNumber: z.string().max(50, { error: d.idDocumentNumber.max }).nullable(),
  address: z.string().max(500, { error: d.address.max }).nullable(),
  locationId: z.uuid({ error: d.locationId.invalid }).nullable(),
  preferredLanguage: z
    .enum(EPreferredLanguages, { error: d.preferredLanguage.invalid })
    .default('es'),
  preferredCurrencyId: z.uuid({ error: d.preferredCurrencyId.invalid }).nullable(),
  isActive: z.boolean().default(true),
  isEmailVerified: z.boolean().default(false),
  lastLogin: timestampField.nullable(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  // Computed fields (not stored in DB, populated on demand)
  isSuperadmin: z.boolean().optional(),
  // Relations
  location: locationSchema.optional(),
  preferredCurrency: currencySchema.optional(),
})
