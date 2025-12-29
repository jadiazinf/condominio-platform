import { z } from 'zod'
import { baseModelSchema, timestampField } from '../../shared/base-model.schema'
import { locationSchema } from '../locations/schema'
import { currencySchema } from '../currencies/schema'

export const EIdDocumentTypes = ['CI', 'RIF', 'Pasaporte'] as const

export const EPreferredLanguages = ['es', 'en'] as const

export const userSchema = baseModelSchema.extend({
  firebaseUid: z.string().max(128),
  email: z.email().max(255),
  displayName: z.string().max(255).nullable(),
  phoneNumber: z.string().max(50).nullable(),
  photoUrl: z.string().url().nullable(),
  firstName: z.string().max(100).nullable(),
  lastName: z.string().max(100).nullable(),
  idDocumentType: z.enum(EIdDocumentTypes).nullable(),
  idDocumentNumber: z.string().max(50).nullable(),
  address: z.string().max(500).nullable(),
  locationId: z.uuid().nullable(),
  preferredLanguage: z.enum(EPreferredLanguages).default('es'),
  preferredCurrencyId: z.uuid().nullable(),
  isActive: z.boolean().default(true),
  isEmailVerified: z.boolean().default(false),
  lastLogin: timestampField.nullable(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  // Relations
  location: locationSchema.optional(),
  preferredCurrency: currencySchema.optional(),
})
