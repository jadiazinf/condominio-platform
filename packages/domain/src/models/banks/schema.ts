import { z } from 'zod'
import { baseModelSchema } from '../../shared/base-model.schema'
import { ALL_BANK_PAYMENT_METHODS } from '../bank-accounts/constants'

export const EBankAccountCategories = ['national', 'international'] as const

export const bankSchema = baseModelSchema.extend({
  name: z.string().max(255),
  code: z.string().max(20).nullable(),
  swiftCode: z.string().max(11).nullable(),
  country: z.string().length(2),
  accountCategory: z.enum(EBankAccountCategories),
  supportedPaymentMethods: z.array(z.enum(ALL_BANK_PAYMENT_METHODS)).nullable(),
  logoUrl: z.string().url().nullable(),
  isActive: z.boolean().default(true),
  metadata: z.record(z.string(), z.unknown()).nullable(),
})

export const bankCreateSchema = bankSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
})
