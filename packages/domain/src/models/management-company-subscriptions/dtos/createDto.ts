import { z } from 'zod'
import { managementCompanySubscriptionSchema } from '../schema'

export const managementCompanySubscriptionCreateSchema = managementCompanySubscriptionSchema
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
    managementCompany: true,
    currency: true,
    createdByUser: true,
    cancelledByUser: true,
  })
  .extend({
    // Override limit fields to be required (positive integers, not nullable)
    maxCondominiums: z.number().int().positive({ message: 'Maximum condominiums must be a positive integer' }),
    maxUnits: z.number().int().positive({ message: 'Maximum units must be a positive integer' }),
    maxUsers: z.number().int().positive({ message: 'Maximum users must be a positive integer' }),
    maxStorageGb: z.number().int().positive({ message: 'Maximum storage must be a positive integer' }),
  })
