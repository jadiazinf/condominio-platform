import { eventLogSchema } from '../schema'

export const eventLogCreateSchema = eventLogSchema.omit({
  id: true,
  createdAt: true,
})
