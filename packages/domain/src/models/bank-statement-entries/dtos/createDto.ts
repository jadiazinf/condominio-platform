import { bankStatementEntrySchema } from '../schema'

export const bankStatementEntryCreateSchema = bankStatementEntrySchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  status: true,
  matchedAt: true,
})
