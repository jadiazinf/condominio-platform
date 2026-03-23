import { z } from 'zod'
import { bankReconciliationCreateSchema } from './createDto'
import { bankReconciliationUpdateSchema } from './updateDto'

export type TBankReconciliationCreate = z.infer<typeof bankReconciliationCreateSchema>
export type TBankReconciliationUpdate = z.infer<typeof bankReconciliationUpdateSchema>
