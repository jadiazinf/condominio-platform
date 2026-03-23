import { bankStatementEntrySchema } from '../schema'

export const bankStatementEntryUpdateSchema = bankStatementEntrySchema
  .pick({
    status: true,
    matchedAt: true,
    metadata: true,
  })
  .partial()
