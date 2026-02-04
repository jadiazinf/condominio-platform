import { condominiumSchema } from '../schema'

export const condominiumCreateSchema = condominiumSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  managementCompanies: true,
  location: true,
  defaultCurrency: true,
  createdByUser: true,
})
