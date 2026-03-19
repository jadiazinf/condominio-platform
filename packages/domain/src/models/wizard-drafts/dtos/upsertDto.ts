import { wizardDraftSchema } from '../schema'

export const wizardDraftUpsertSchema = wizardDraftSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
})
