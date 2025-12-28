import { exchangeRateSchema } from '../schema'

export const exchangeRateCreateSchema = exchangeRateSchema.omit({
  id: true,
  createdAt: true,
  fromCurrency: true,
  toCurrency: true,
  createdByUser: true,
})
