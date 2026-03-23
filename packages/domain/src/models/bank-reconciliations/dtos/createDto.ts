import { bankReconciliationSchema } from '../schema'

export const bankReconciliationCreateSchema = bankReconciliationSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  status: true,
  totalMatched: true,
  totalUnmatched: true,
  totalIgnored: true,
  reconciledBy: true,
  reconciledAt: true,
})
