import { z } from 'zod'
import { bankStatementImportCreateSchema } from './createDto'
import { bankStatementImportUpdateSchema } from './updateDto'

export type TBankStatementImportCreate = z.infer<typeof bankStatementImportCreateSchema>
export type TBankStatementImportUpdate = z.infer<typeof bankStatementImportUpdateSchema>
