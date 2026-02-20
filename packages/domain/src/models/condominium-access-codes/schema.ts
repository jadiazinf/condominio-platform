import { z } from 'zod'
import { baseModelSchema, timestampField } from '../../shared/base-model.schema'

export const EAccessCodeValidity = ['1_day', '7_days', '1_month', '1_year'] as const

export const condominiumAccessCodeSchema = baseModelSchema.extend({
  condominiumId: z.uuid(),
  code: z.string().min(6).max(8),
  expiresAt: timestampField,
  isActive: z.boolean().default(true),
  createdBy: z.uuid().nullable(),
})
