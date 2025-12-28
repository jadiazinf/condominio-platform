import { expenseSchema } from '../schema'

export const expenseCreateSchema = expenseSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  condominium: true,
  building: true,
  expenseCategory: true,
  currency: true,
  approvedByUser: true,
  createdByUser: true,
})
