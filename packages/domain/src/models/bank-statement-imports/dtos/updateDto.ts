import { bankStatementImportSchema } from '../schema'

export const bankStatementImportUpdateSchema = bankStatementImportSchema
  .pick({
    status: true,
    totalEntries: true,
    totalCredits: true,
    totalDebits: true,
    metadata: true,
  })
  .partial()
