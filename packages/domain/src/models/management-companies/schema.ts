import { z } from 'zod'
import { baseModelSchema } from '../../shared/base-model.schema'
import { locationSchema } from '../locations/schema'
import { userSchema } from '../users/schema'

export const managementCompanySchema = baseModelSchema.extend({
  name: z.string().max(255),
  legalName: z.string().max(255).nullable(),
  taxId: z.string().max(100).nullable(),
  email: z.string().email().max(255).nullable(),
  phone: z.string().max(50).nullable(),
  website: z.string().url().max(255).nullable(),
  address: z.string().max(500).nullable(),
  locationId: z.uuid().nullable(),
  isActive: z.boolean().default(true),
  logoUrl: z.string().url().nullable(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  createdBy: z.uuid().nullable(),
  // Relations
  location: locationSchema.optional(),
  createdByUser: userSchema.optional(),
})
