import { z } from 'zod'
import { EFormulaTypes, quotaFormulaSchema } from './schema'

export type TFormulaType = (typeof EFormulaTypes)[number]

export type TQuotaFormula = z.infer<typeof quotaFormulaSchema>
