import { z } from 'zod'
import { timestampField } from '../../shared/base-model.schema'
import { DomainLocaleDictionary } from '../../i18n/dictionary'

const d = DomainLocaleDictionary.validation.models.quotaFormulas

export const EFormulaTypes = ['fixed', 'expression', 'per_unit'] as const

export const quotaFormulaSchema = z.object({
  id: z.uuid(),
  condominiumId: z.uuid({ error: d.condominiumId.invalid }),
  name: z.string({ error: d.name.required }).max(255, { error: d.name.max }),
  description: z.string().nullish(),
  formulaType: z.enum(EFormulaTypes, { error: d.formulaType.invalid }),
  fixedAmount: z.string().nullish(),
  expression: z.string().nullish(),
  variables: z.record(z.string(), z.unknown()).nullable(),
  unitAmounts: z.record(z.string(), z.unknown()).nullable(),
  currencyId: z.uuid({ error: d.currencyId.invalid }),
  isActive: z.boolean().default(true),
  createdBy: z.uuid({ error: d.createdBy.invalid }),
  createdAt: timestampField,
  updatedBy: z.uuid({ error: d.updatedBy.invalid }).nullish(),
  updatedAt: timestampField,
  updateReason: z.string().nullish(),
})
