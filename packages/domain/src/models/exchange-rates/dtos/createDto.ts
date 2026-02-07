import { exchangeRateSchema } from '../schema'

export const exchangeRateCreateSchema = exchangeRateSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  fromCurrency: true,
  toCurrency: true,
  createdByUser: true,
})
