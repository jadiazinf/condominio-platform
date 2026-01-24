import { adminInvitationSchema } from '../schema'

export const adminInvitationCreateSchema = adminInvitationSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
})
