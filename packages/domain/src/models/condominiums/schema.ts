import { z } from 'zod'
import { baseModelSchema } from '../../shared/base-model.schema'
import { managementCompanySchema } from '../management-companies/schema'
import { locationSchema } from '../locations/schema'
import { currencySchema } from '../currencies/schema'
import { userSchema } from '../users/schema'

export const condominiumSchema = baseModelSchema.extend({
  name: z.string().max(255),
  code: z.string().max(50).nullable(),
  managementCompanyId: z.uuid().nullable(),
  address: z.string().max(500).nullable(),
  locationId: z.uuid().nullable(),
  email: z.email().max(255).nullable(),
  phone: z.string().max(50).nullable(),
  defaultCurrencyId: z.uuid().nullable(),
  isActive: z.boolean().default(true),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  createdBy: z.uuid().nullable(),
  // Relations
  managementCompany: managementCompanySchema.optional(),
  location: locationSchema.optional(),
  defaultCurrency: currencySchema.optional(),
  createdByUser: userSchema.optional(),
})
