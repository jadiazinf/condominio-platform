import { amenityCreateSchema } from './createDto'

export const amenityUpdateSchema = amenityCreateSchema.partial()
