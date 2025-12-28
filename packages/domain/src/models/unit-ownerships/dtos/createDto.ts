import { unitOwnershipSchema } from '../schema'

export const unitOwnershipCreateSchema = unitOwnershipSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  unit: true,
  user: true,
})
