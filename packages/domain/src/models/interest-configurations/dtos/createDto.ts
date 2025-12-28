import { interestConfigurationSchema } from '../schema'

export const interestConfigurationCreateSchema = interestConfigurationSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  condominium: true,
  building: true,
  paymentConcept: true,
  currency: true,
  createdByUser: true,
})
