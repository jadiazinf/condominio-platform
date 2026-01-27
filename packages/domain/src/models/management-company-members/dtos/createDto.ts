import { managementCompanyMemberSchema } from '../schema'

export const managementCompanyMemberCreateSchema = managementCompanyMemberSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  managementCompany: true,
  user: true,
  invitedByUser: true,
  deactivatedByUser: true,
})
