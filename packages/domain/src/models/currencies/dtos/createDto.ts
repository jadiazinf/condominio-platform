import { currencySchema } from '../schema'

export const currencyCreateSchema = currencySchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
})
