import { adminInvitationSchema } from '../schema'

export const adminInvitationUpdateSchema = adminInvitationSchema
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
    userId: true,
    managementCompanyId: true,
    token: true,
    tokenHash: true,
    email: true,
    createdBy: true,
  })
  .partial()
