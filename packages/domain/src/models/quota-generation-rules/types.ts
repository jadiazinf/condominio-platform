import { z } from 'zod'
import { quotaGenerationRuleSchema } from './schema'

export type TQuotaGenerationRule = z.infer<typeof quotaGenerationRuleSchema>
