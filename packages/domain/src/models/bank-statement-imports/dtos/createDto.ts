import { bankStatementImportSchema } from '../schema'

export const bankStatementImportCreateSchema = bankStatementImportSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  status: true,
  totalEntries: true,
  totalCredits: true,
  totalDebits: true,
})
