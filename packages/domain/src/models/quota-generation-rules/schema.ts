import { z } from 'zod'
import { timestampField, dateField } from '../../shared/base-model.schema'
import { DomainLocaleDictionary } from '../../i18n/dictionary'

const d = DomainLocaleDictionary.validation.models.quotaGenerationRules

export const quotaGenerationRuleSchema = z.object({
  id: z.uuid(),
  condominiumId: z.uuid({ error: d.condominiumId.invalid }),
  buildingId: z.uuid({ error: d.buildingId.invalid }).nullish(),
  paymentConceptId: z.uuid({ error: d.paymentConceptId.invalid }),
  quotaFormulaId: z.uuid({ error: d.quotaFormulaId.invalid }),
  name: z.string({ error: d.name.required }).max(255, { error: d.name.max }),
  description: z.string().nullish(),
  effectiveFrom: dateField,
  effectiveTo: dateField.nullish(),
  isActive: z.boolean().default(true),
  createdBy: z.uuid({ error: d.createdBy.invalid }),
  createdAt: timestampField,
  updatedBy: z.uuid({ error: d.updatedBy.invalid }).nullish(),
  updatedAt: timestampField,
  updateReason: z.string().nullish(),
})
