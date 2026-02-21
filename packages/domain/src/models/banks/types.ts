import { z } from 'zod'
import { bankSchema, bankCreateSchema, EBankAccountCategories } from './schema'

export type TBank = z.infer<typeof bankSchema>
export type TBankCreate = z.infer<typeof bankCreateSchema>
export type TBankAccountCategory = (typeof EBankAccountCategories)[number]
