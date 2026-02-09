import { z } from 'zod'
import { baseModelSchema } from '../../shared/base-model.schema'

export const amenitySchema = baseModelSchema.extend({
  condominiumId: z.uuid('Invalid condominium ID'),
  name: z.string('Name is required').max(255, 'Name must be at most 255 characters'),
  description: z.string().nullable(),
  location: z.string().max(255, 'Location must be at most 255 characters').nullable(),
  capacity: z.number().int('Capacity must be an integer').nullable(),
  requiresApproval: z.boolean().default(false),
  reservationRules: z.record(z.string(), z.unknown()).nullable(),
  isActive: z.boolean().default(true),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  createdBy: z.uuid().nullable(),
})
