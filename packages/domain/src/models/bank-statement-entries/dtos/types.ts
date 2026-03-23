import { z } from 'zod'
import { bankStatementEntryCreateSchema } from './createDto'
import { bankStatementEntryUpdateSchema } from './updateDto'

export type TBankStatementEntryCreate = z.infer<typeof bankStatementEntryCreateSchema>
export type TBankStatementEntryUpdate = z.infer<typeof bankStatementEntryUpdateSchema>
