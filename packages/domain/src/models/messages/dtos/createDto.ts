import { messageSchema } from '../schema'

export const messageCreateSchema = messageSchema.omit({
  id: true,
  sentAt: true,
  sender: true,
  recipientUser: true,
  recipientCondominium: true,
  recipientBuilding: true,
  recipientUnit: true,
})
