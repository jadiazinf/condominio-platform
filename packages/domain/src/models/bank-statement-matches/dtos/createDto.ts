import { bankStatementMatchSchema } from '../schema'

export const bankStatementMatchCreateSchema = bankStatementMatchSchema.omit({
  id: true,
  createdAt: true,
})
