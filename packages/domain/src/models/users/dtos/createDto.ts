import { userSchema } from '../schema'

export const userCreateSchema = userSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  location: true,
  preferredCurrency: true,
})
