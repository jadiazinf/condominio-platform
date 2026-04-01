import { z } from 'zod'

export const paymentAllocationSchema = z.object({
  id: z.uuid(),
  paymentId: z.uuid(),
  chargeId: z.uuid(),
  allocatedAmount: z.string(), // decimal as string
  allocatedAt: z.coerce.date(),
  reversed: z.boolean().default(false),
  reversedAt: z.coerce.date().nullable(),
  createdBy: z.uuid().nullable(),
})
