import { z } from 'zod'
import { EReconciliationStatuses, bankReconciliationSchema } from './schema'

export type TReconciliationStatus = (typeof EReconciliationStatuses)[number]
export type TBankReconciliation = z.infer<typeof bankReconciliationSchema>
