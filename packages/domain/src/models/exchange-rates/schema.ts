import { z } from 'zod'
import { dateField, timestampField } from '../../shared/base-model.schema'
import { currencySchema } from '../currencies/schema'
import { userSchema } from '../users/schema'
import { DomainLocaleDictionary } from '../../i18n/dictionary'

const d = DomainLocaleDictionary.validation.models.exchangeRates

export const exchangeRateSchema = z.object({
  id: z.uuid(),
  fromCurrencyId: z.uuid({ error: d.fromCurrencyId.invalid }),
  toCurrencyId: z.uuid({ error: d.toCurrencyId.invalid }),
  rate: z.string({ error: d.rate.required }),
  effectiveDate: dateField,
  source: z.string().max(100, { error: d.source.max }).nullable(),
  isActive: z.boolean().default(true),
  createdAt: timestampField,
  updatedAt: timestampField,
  createdBy: z.uuid({ error: d.createdBy.invalid }).nullable(),
  registeredBy: z.uuid().nullable(),
  // Relations
  fromCurrency: currencySchema.optional(),
  toCurrency: currencySchema.optional(),
  createdByUser: userSchema.optional(),
})
