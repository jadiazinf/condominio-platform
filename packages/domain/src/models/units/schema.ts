import { z } from 'zod'
import { baseModelSchema } from '../../shared/base-model.schema'
import { buildingSchema } from '../buildings/schema'
import { userSchema } from '../users/schema'
import { DomainLocaleDictionary } from '../../i18n/dictionary'

const d = DomainLocaleDictionary.validation.models.units

export const unitSchema = baseModelSchema.extend({
  buildingId: z.uuid({ error: d.buildingId.invalid }),
  unitNumber: z
    .string({ error: d.unitNumber.required })
    .max(50, { error: d.unitNumber.max }),
  floor: z.number().int({ error: d.floor.invalid }).nullable(),
  areaM2: z.string().nullable(),
  bedrooms: z.number().int({ error: d.bedrooms.invalid }).nullable(),
  bathrooms: z.number().int({ error: d.bathrooms.invalid }).nullable(),
  parkingSpaces: z.number().int({ error: d.parkingSpaces.invalid }).default(0),
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
