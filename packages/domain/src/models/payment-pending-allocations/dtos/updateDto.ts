import { paymentPendingAllocationSchema } from '../schema'

// Updated by admin to allocate the pending amount
export const paymentPendingAllocationUpdateSchema = paymentPendingAllocationSchema
  .pick({
    status: true,
    resolutionType: true,
    resolutionNotes: true,
    allocatedToQuotaId: true,
    allocatedBy: true,
  })
  .partial()
