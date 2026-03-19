import { z } from 'zod'
import { wizardDraftUpsertSchema } from './upsertDto'

export type TWizardDraftUpsert = z.infer<typeof wizardDraftUpsertSchema>
