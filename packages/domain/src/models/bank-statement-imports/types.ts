import { z } from 'zod'
import { EBankStatementImportStatuses, bankStatementImportSchema } from './schema'

export type TBankStatementImportStatus = (typeof EBankStatementImportStatuses)[number]
export type TBankStatementImport = z.infer<typeof bankStatementImportSchema>
