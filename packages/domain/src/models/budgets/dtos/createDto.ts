import { budgetSchema } from '../schema'

export const budgetCreateSchema = budgetSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  approvedBy: true,
  approvedAt: true,
  status: true,
})
