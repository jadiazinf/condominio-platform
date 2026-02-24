import { z } from 'zod'

export const paymentConceptServiceSchema = z.object({
  id: z.uuid(),
  paymentConceptId: z.uuid(),
  serviceId: z.uuid(),
  amount: z.number().positive(),
  useDefaultAmount: z.boolean().default(true),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export const paymentConceptServiceCreateSchema = z.object({
  serviceId: z.string().uuid(),
  amount: z.number().positive('Amount must be greater than 0'),
  useDefaultAmount: z.boolean().default(true),
})

export const paymentConceptServiceLinkSchema = z.object({
  paymentConceptId: z.string().uuid(),
  serviceId: z.string().uuid(),
  amount: z.number().positive('Amount must be greater than 0'),
  useDefaultAmount: z.boolean().default(true),
})
