import { z } from 'zod'
import { bankStatementMatchCreateSchema } from './createDto'

export type TBankStatementMatchCreate = z.infer<typeof bankStatementMatchCreateSchema>
