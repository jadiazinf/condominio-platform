import { z } from 'zod'
import { dateField, timestampField } from '../../shared/base-model.schema'
import { currencySchema } from '../currencies/schema'
import { userSchema } from '../users/schema'

export const exchangeRateSchema = z.object({
  id: z.uuid(),
  fromCurrencyId: z.uuid(),
  toCurrencyId: z.uuid(),
  rate: z.string(),
  effectiveDate: dateField,
  source: z.string().max(100).nullable(),
  createdAt: timestampField,
  createdBy: z.uuid().nullable(),
  registeredBy: z.uuid().nullable(),
  // Relations
  fromCurrency: currencySchema.optional(),
  toCurrency: currencySchema.optional(),
  createdByUser: userSchema.optional(),
})
