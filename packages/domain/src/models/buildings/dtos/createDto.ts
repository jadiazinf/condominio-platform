import { buildingSchema } from '../schema'

// Nullable fields are made optional for creation — the DB defaults them to NULL.
// This allows callers to omit fields they don't need (e.g. wizard sends only name/code/floorsCount).
export const buildingCreateSchema = buildingSchema
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
    condominium: true,
    createdByUser: true,
  })
  .partial({
    code: true,
    address: true,
    floorsCount: true,
    unitsCount: true,
    bankAccountHolder: true,
    bankName: true,
    bankAccountNumber: true,
    bankAccountType: true,
    metadata: true,
    createdBy: true,
  })
