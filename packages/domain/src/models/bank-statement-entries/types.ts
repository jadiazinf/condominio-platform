import { z } from 'zod'
import {
  EBankStatementEntryTypes,
  EBankStatementEntryStatuses,
  bankStatementEntrySchema,
} from './schema'

export type TBankStatementEntryType = (typeof EBankStatementEntryTypes)[number]
export type TBankStatementEntryStatus = (typeof EBankStatementEntryStatuses)[number]
export type TBankStatementEntry = z.infer<typeof bankStatementEntrySchema>
