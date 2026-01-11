import { z } from 'zod'
import { timestampField } from '../../shared/base-model.schema'
import { quotaSchema } from '../quotas/schema'
import { userSchema } from '../users/schema'
import { DomainLocaleDictionary } from '../../i18n/dictionary'

const d = DomainLocaleDictionary.validation.models.quotaAdjustments

export const EAdjustmentTypes = ['discount', 'increase', 'correction', 'waiver'] as const

// Note: quota_adjustments doesn't have updatedAt, so we don't extend baseModelSchema
export const quotaAdjustmentSchema = z.object({
  id: z.uuid(),
  quotaId: z.uuid({ error: d.quotaId.invalid }),
  previousAmount: z.string({ error: d.previousAmount.required }),
  newAmount: z.string({ error: d.newAmount.required }),
  adjustmentType: z.enum(EAdjustmentTypes, { error: d.adjustmentType.invalid }),
  reason: z.string({ error: d.reason.required }).min(10, { error: d.reason.min }),
  createdBy: z.uuid({ error: d.createdBy.invalid }),
  createdAt: timestampField,
  // Relations
  quota: quotaSchema.optional(),
  createdByUser: userSchema.optional(),
})
