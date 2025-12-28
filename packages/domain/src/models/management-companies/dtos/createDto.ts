import { managementCompanySchema } from '../schema'

export const managementCompanyCreateSchema = managementCompanySchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  location: true,
  createdByUser: true,
})
