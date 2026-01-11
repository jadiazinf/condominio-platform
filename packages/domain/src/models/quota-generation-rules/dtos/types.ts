import { z } from 'zod'
import { quotaGenerationRuleCreateSchema } from './createDto'
import { quotaGenerationRuleUpdateSchema } from './updateDto'

export type TQuotaGenerationRuleCreate = z.infer<typeof quotaGenerationRuleCreateSchema>
export type TQuotaGenerationRuleUpdate = z.infer<typeof quotaGenerationRuleUpdateSchema>
