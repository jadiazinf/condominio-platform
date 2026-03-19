import { z } from 'zod'
import { baseModelSchema } from '../../shared/base-model.schema'

export const WIZARD_TYPES = ['payment_concept'] as const
export type TWizardType = (typeof WIZARD_TYPES)[number]

export const wizardDraftSchema = baseModelSchema.extend({
  wizardType: z.enum(WIZARD_TYPES),
  entityId: z.uuid(),
  data: z.record(z.string(), z.unknown()),
  currentStep: z.number().int().min(0),
  lastModifiedBy: z.uuid().nullable(),
})
