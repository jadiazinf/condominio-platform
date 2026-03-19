import { z } from 'zod'
import { wizardDraftSchema } from './schema'

export type TWizardDraft = z.infer<typeof wizardDraftSchema>
