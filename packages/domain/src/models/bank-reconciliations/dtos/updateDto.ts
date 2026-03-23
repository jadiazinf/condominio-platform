import { bankReconciliationSchema } from '../schema'

export const bankReconciliationUpdateSchema = bankReconciliationSchema
  .pick({
    status: true,
    totalMatched: true,
    totalUnmatched: true,
    totalIgnored: true,
    reconciledBy: true,
    reconciledAt: true,
    notes: true,
    metadata: true,
  })
  .partial()
