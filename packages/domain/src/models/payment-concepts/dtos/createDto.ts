import { paymentConceptSchema } from '../schema'

export const paymentConceptCreateSchema = paymentConceptSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  condominium: true,
  building: true,
  currency: true,
  createdByUser: true,
})
