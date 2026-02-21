import { z } from 'zod'
import {
  bankAccountSchema,
  bankAccountCreateSchema,
  bankAccountNationalDetailsSchema,
  bankAccountInternationalDetailsSchema,
} from './schema'
import type { ALL_BANK_PAYMENT_METHODS } from './constants'

export type TBankAccount = z.infer<typeof bankAccountSchema>
export type TBankAccountCreate = z.infer<typeof bankAccountCreateSchema>
export type TBankAccountNationalDetails = z.infer<typeof bankAccountNationalDetailsSchema>
export type TBankAccountInternationalDetails = z.infer<typeof bankAccountInternationalDetailsSchema>
export type TBankPaymentMethod = (typeof ALL_BANK_PAYMENT_METHODS)[number]
