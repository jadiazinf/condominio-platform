import { paymentPendingAllocationSchema } from '../schema'

// Created by the system when a payment has excess amount
export const paymentPendingAllocationCreateSchema = paymentPendingAllocationSchema.omit({
  id: true,
  createdAt: true,
  allocatedBy: true,
  allocatedAt: true,
  resolutionType: true,
  resolutionNotes: true,
  allocatedToQuotaId: true,
})
