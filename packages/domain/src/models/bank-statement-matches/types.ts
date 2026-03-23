import { z } from 'zod'
import { EMatchTypes, bankStatementMatchSchema } from './schema'

export type TMatchType = (typeof EMatchTypes)[number]
export type TBankStatementMatch = z.infer<typeof bankStatementMatchSchema>
