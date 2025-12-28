import { z } from 'zod'
import { baseModelSchema } from '../../shared/base-model.schema'

export const currencySchema = baseModelSchema.extend({
  code: z.string().max(10),
  name: z.string().max(100),
  symbol: z.string().max(10).nullable(),
  isBaseCurrency: z.boolean().default(false),
  isActive: z.boolean().default(true),
  decimals: z.number().int().default(2),
  registeredBy: z.uuid().nullable(),
})
