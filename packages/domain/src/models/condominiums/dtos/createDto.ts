import { condominiumSchema } from '../schema'

export const condominiumCreateSchema = condominiumSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  managementCompany: true,
  location: true,
  defaultCurrency: true,
  createdByUser: true,
})
