import { z } from 'zod'
import { baseModelSchema } from '../../shared/base-model.schema'
import { DomainLocaleDictionary } from '../../i18n/dictionary'

const d = DomainLocaleDictionary.validation.models.currencies

export const currencySchema = baseModelSchema.extend({
  code: z.string({ error: d.code.required }).max(10, { error: d.code.max }),
  name: z.string({ error: d.name.required }).max(100, { error: d.name.max }),
  symbol: z.string().max(10, { error: d.symbol.max }).nullable(),
  isBaseCurrency: z.boolean().default(false),
  isActive: z.boolean().default(true),
  decimals: z.number().int({ error: d.decimals.invalid }).default(2),
  registeredBy: z.uuid().nullable(),
})
