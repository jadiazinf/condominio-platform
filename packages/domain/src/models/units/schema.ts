import { z } from 'zod'
import { baseModelSchema } from '../../shared/base-model.schema'
import { buildingSchema } from '../buildings/schema'
import { userSchema } from '../users/schema'

export const unitSchema = baseModelSchema.extend({
  buildingId: z.uuid(),
  unitNumber: z.string().max(50),
  floor: z.number().int().nullable(),
  areaM2: z.string().nullable(),
  bedrooms: z.number().int().nullable(),
  bathrooms: z.number().int().nullable(),
  parkingSpaces: z.number().int().default(0),
  parkingIdentifiers: z.array(z.string()).nullable(),
  storageIdentifier: z.string().max(50).nullable(),
  aliquotPercentage: z.string().nullable(),
  isActive: z.boolean().default(true),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  createdBy: z.uuid().nullable(),
  // Relations
  building: buildingSchema.optional(),
  createdByUser: userSchema.optional(),
})
