import { documentSchema } from '../schema'

export const documentCreateSchema = documentSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  condominium: true,
  building: true,
  unit: true,
  user: true,
  payment: true,
  quota: true,
  expense: true,
  createdByUser: true,
})
