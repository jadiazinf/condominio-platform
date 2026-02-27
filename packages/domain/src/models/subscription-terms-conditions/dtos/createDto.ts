import { z } from 'zod'
import { subscriptionTermsConditionsSchema } from '../schema'

export const subscriptionTermsConditionsCreateSchema = subscriptionTermsConditionsSchema
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
    createdByUser: true,
  })
  .extend({
    createdBy: z.uuid().nullable().optional(),
  })
