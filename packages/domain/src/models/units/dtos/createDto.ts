import { unitSchema } from '../schema'

// Nullable fields are made optional for creation — the DB defaults them to NULL.
// This allows callers to omit fields they don't need (e.g. wizard sends only buildingId/unitNumber).
export const unitCreateSchema = unitSchema
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
    building: true,
    createdByUser: true,
  })
  .partial({
    floor: true,
    areaM2: true,
    bedrooms: true,
    bathrooms: true,
    parkingIdentifiers: true,
    storageIdentifier: true,
    aliquotPercentage: true,
    metadata: true,
    createdBy: true,
  })
