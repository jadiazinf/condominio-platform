import { z } from 'zod'
import { baseModelSchema } from '../../shared/base-model.schema'
import { locationSchema } from '../locations/schema'
import { userSchema } from '../users/schema'
import { DomainLocaleDictionary } from '../../i18n/dictionary'

const d = DomainLocaleDictionary.validation.models.managementCompanies

// Tax ID types for companies (RIF prefixes in Venezuela)
export const ETaxIdTypes = ['J', 'G', 'V', 'E', 'P'] as const

export const managementCompanySchema = baseModelSchema.extend({
  name: z.string({ error: d.name.required }).max(255, { error: d.name.max }),
  legalName: z.string().max(255, { error: d.legalName.max }).nullable(),
  taxIdType: z.enum(ETaxIdTypes, { error: d.taxIdType.invalid }).nullable(),
  taxIdNumber: z.string().max(50, { error: d.taxIdNumber.max }).nullable(),
  email: z.email({ error: d.email.invalid }).max(255, { error: d.email.max }).nullable(),
  phoneCountryCode: z.string().max(10).nullable(),
  phone: z.string().max(50, { error: d.phone.max }).nullable(),
  website: z
    .string()
    .url({ error: d.website.invalid })
    .max(255, { error: d.website.max })
    .nullable(),
  address: z.string().max(500, { error: d.address.max }).nullable(),
  locationId: z.uuid({ error: d.locationId.invalid }).nullable(),
  isActive: z.boolean().default(true),
  logoUrl: z.string().url({ error: d.logoUrl.invalid }).nullable(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  createdBy: z.uuid({ error: d.createdBy.invalid }).nullable(),
  // Relations
  location: locationSchema.optional(),
  createdByUser: userSchema.optional(),
})
