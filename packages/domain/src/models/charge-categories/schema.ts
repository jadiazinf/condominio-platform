import { z } from 'zod'
import { baseModelSchema } from '../../shared/base-model.schema'

export const EChargeCategoryNames = [
  'ordinary',
  'extraordinary',
  'reserve_fund',
  'social_benefits',
  'non_common',
  'fine',
  'interest',
  'late_fee',
  'discount',
  'credit_note',
  'debit_note',
  'other',
] as const

export const chargeCategorySchema = baseModelSchema.extend({
  name: z.string(),
  description: z.string().nullable(),
  labels: z.record(z.string(), z.string()),
  label: z.string().optional(),
  isSystem: z.boolean(),
  isActive: z.boolean(),
  sortOrder: z.number(),
})
